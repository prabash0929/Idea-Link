using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using PAS_Project.Data;
using PAS_Project.Models;
using System.Linq;

namespace PAS_Project.Controllers
{
    [Authorize(Roles = "Admin")]
    [ApiController]
    [Route("api/admin")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminController(AppDbContext context)
        {
            _context = context;
        }

        // ========== Research Area Management ==========

        [HttpGet("research-areas")]
        public IActionResult GetResearchAreas()
        {
            return Ok(_context.ResearchAreas.OrderBy(r => r.Name).ToList());
        }

        [HttpPost("research-areas")]
        public IActionResult AddResearchArea([FromBody] ResearchArea area)
        {
            if (string.IsNullOrWhiteSpace(area.Name))
                return BadRequest("Research area name is required.");

            if (_context.ResearchAreas.Any(r => r.Name.ToLower() == area.Name.ToLower()))
                return BadRequest("This research area already exists.");

            _context.ResearchAreas.Add(area);
            _context.SaveChanges();
            return Ok(area);
        }

        [HttpDelete("research-areas/{id}")]
        public IActionResult DeleteResearchArea(int id)
        {
            var area = _context.ResearchAreas.Find(id);
            if (area == null) return NotFound();

            _context.ResearchAreas.Remove(area);
            _context.SaveChanges();
            return Ok(new { message = "Research Area Deleted" });
        }

        // ========== Allocation Oversight ==========

        [HttpGet("matches")]
        public IActionResult GetAllMatches()
        {
            var matches = _context.Matches
                .Select(m => new
                {
                    m.Id,
                    m.ProjectId,
                    m.SupervisorId,
                    m.IsConfirmed,
                    m.MatchedAt,
                    ProjectTitle = m.Project.Title,
                    ProjectArea = m.Project.ResearchArea,
                    StudentName = m.Project.Student.User.Name,
                    StudentEmail = m.Project.Student.User.Email,
                    SupervisorName = m.Supervisor.User.Name,
                    SupervisorEmail = m.Supervisor.User.Email
                })
                .OrderByDescending(m => m.MatchedAt)
                .ToList();

            return Ok(matches);
        }

        // View all projects with status
        [HttpGet("projects")]
        public IActionResult GetAllProjects()
        {
            var projects = _context.Projects
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Abstract,
                    p.TechStack,
                    p.ResearchArea,
                    p.Status,
                    p.CreatedAt,
                    StudentName = p.Student.User.Name
                })
                .OrderByDescending(p => p.CreatedAt)
                .ToList();

            return Ok(projects);
        }

        // Break/remove a match – returns project to Pending
        [HttpDelete("matches/{matchId}")]
        public IActionResult BreakMatch(int matchId)
        {
            var match = _context.Matches.Find(matchId);
            if (match == null) return NotFound("Match not found.");

            var project = _context.Projects.Find(match.ProjectId);
            if (project != null)
            {
                project.Status = "Pending";
            }

            _context.Matches.Remove(match);
            _context.SaveChanges();
            return Ok(new { message = "Match removed. Project returned to pending." });
        }

        // Reassign a match to a different supervisor
        [HttpPut("reassign/{matchId}")]
        public IActionResult ReassignMatch(int matchId, [FromQuery] int newSupervisorId)
        {
            var match = _context.Matches.Find(matchId);
            if (match == null) return NotFound("Match not found.");

            var newSupervisor = _context.Supervisors.Find(newSupervisorId);
            if (newSupervisor == null) return NotFound("Supervisor not found.");

            match.SupervisorId = newSupervisorId;
            match.IsConfirmed = false;
            match.MatchedAt = DateTime.UtcNow;

            var project = _context.Projects.Find(match.ProjectId);
            if (project != null) project.Status = "Under Review";

            _context.SaveChanges();
            return Ok(new { message = "Project reassigned to new supervisor. Awaiting confirmation." });
        }

        // Get all supervisors (for reassignment dropdown)
        [HttpGet("supervisors")]
        public IActionResult GetAllSupervisors()
        {
            var supervisors = _context.Supervisors
                .Select(s => new
                {
                    s.Id,
                    s.Expertise,
                    Name = s.User.Name,
                    Email = s.User.Email
                })
                .ToList();

            return Ok(supervisors);
        }
    }
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using PAS_Project.Data;
using PAS_Project.Models;
using PAS_Project.DTOs;
using System.Linq;

namespace PAS_Project.Controllers
{
    [Authorize(Roles = "Supervisor")]
    [ApiController]
    [Route("api/supervisor")]
    public class SupervisorController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SupervisorController(AppDbContext context)
        {
            _context = context;
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst("UserId");
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
            {
                return userId;
            }
            return 0;
        }

        private int GetSupervisorId()
        {
            var userId = GetUserId();
            var supervisor = _context.Supervisors.FirstOrDefault(s => s.UserId == userId);
            return supervisor?.Id ?? 0;
        }

        // Get supervisor expertise
        [HttpGet("expertise")]
        public IActionResult GetExpertise()
        {
            var userId = GetUserId();
            var supervisor = _context.Supervisors.FirstOrDefault(s => s.UserId == userId);
            if (supervisor == null) return NotFound("Supervisor profile not found.");
            return Ok(new { supervisor.Expertise });
        }

        // Update supervisor expertise
        [HttpPut("expertise")]
        public IActionResult UpdateExpertise([FromBody] SupervisorExpertiseDto dto)
        {
            var userId = GetUserId();
            var supervisor = _context.Supervisors.FirstOrDefault(s => s.UserId == userId);
            if (supervisor == null) return NotFound("Supervisor profile not found.");

            supervisor.Expertise = dto.Expertise;
            _context.SaveChanges();
            return Ok(new { message = "Expertise updated successfully.", supervisor.Expertise });
        }

        // Blind View (NO student details) – with optional area filter
        [HttpGet("projects")]
        public IActionResult GetProjects([FromQuery] string area = null)
        {
            var query = _context.Projects
                .Where(p => p.Status == "Pending");

            if (!string.IsNullOrEmpty(area))
            {
                query = query.Where(p => p.ResearchArea.Contains(area));
            }

            var projects = query
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Abstract,
                    p.TechStack,
                    p.ResearchArea,
                    p.CreatedAt
                })
                .OrderByDescending(p => p.CreatedAt)
                .ToList();

            return Ok(projects);
        }

        // Phase 1: Express Interest – mark project as Under Review
        [HttpPost("interest/{projectId}")]
        public IActionResult ShowInterest(int projectId)
        {
            var supervisorId = GetSupervisorId();
            if (supervisorId == 0) return BadRequest("Supervisor profile not found.");

            var project = _context.Projects.Find(projectId);
            if (project == null) return NotFound("Project not found.");
            if (project.Status != "Pending") return BadRequest("Project is no longer available for interest.");

            // Check if supervisor already expressed interest
            var existingMatch = _context.Matches.FirstOrDefault(m => m.ProjectId == projectId && m.SupervisorId == supervisorId);
            if (existingMatch != null) return BadRequest("You have already expressed interest in this project.");

            var match = new Match
            {
                ProjectId = projectId,
                SupervisorId = supervisorId,
                IsConfirmed = false
            };

            _context.Matches.Add(match);
            project.Status = "Under Review";
            _context.SaveChanges();

            return Ok(new { message = "Interest expressed. Project is now under review.", matchId = match.Id });
        }

        // Phase 2: Confirm Match – reveal identities
        [HttpPost("confirm/{matchId}")]
        public IActionResult ConfirmMatch(int matchId)
        {
            var supervisorId = GetSupervisorId();
            if (supervisorId == 0) return BadRequest("Supervisor profile not found.");

            var match = _context.Matches.FirstOrDefault(m => m.Id == matchId && m.SupervisorId == supervisorId);
            if (match == null) return NotFound("Match record not found.");
            if (match.IsConfirmed) return BadRequest("Match is already confirmed.");

            match.IsConfirmed = true;
            match.MatchedAt = DateTime.UtcNow;

            var project = _context.Projects.Find(match.ProjectId);
            project.Status = "Matched";

            _context.SaveChanges();

            // Reveal student identity
            var student = _context.Students.FirstOrDefault(s => s.Id == project.StudentId);
            var studentUser = _context.Users.Find(student.UserId);

            return Ok(new
            {
                message = "Match confirmed! Identities revealed.",
                studentInfo = new { studentUser.Name, studentUser.Email }
            });
        }

        // Cancel interest (before confirmation)
        [HttpDelete("cancel-interest/{matchId}")]
        public IActionResult CancelInterest(int matchId)
        {
            var supervisorId = GetSupervisorId();
            var match = _context.Matches.FirstOrDefault(m => m.Id == matchId && m.SupervisorId == supervisorId);
            if (match == null) return NotFound("Match record not found.");
            if (match.IsConfirmed) return BadRequest("Cannot cancel a confirmed match.");

            var project = _context.Projects.Find(match.ProjectId);
            if (project != null) project.Status = "Pending";

            _context.Matches.Remove(match);
            _context.SaveChanges();

            return Ok(new { message = "Interest cancelled. Project is available again." });
        }

        // Get my pending interests and confirmed matches
        [HttpGet("my-matches")]
        public IActionResult GetMyMatches()
        {
            var supervisorId = GetSupervisorId();

            var matches = _context.Matches
                .Where(m => m.SupervisorId == supervisorId)
                .Select(m => new
                {
                    m.Id,
                    m.ProjectId,
                    m.IsConfirmed,
                    m.MatchedAt,
                    ProjectTitle = m.Project.Title,
                    ProjectAbstract = m.Project.Abstract,
                    ProjectArea = m.Project.ResearchArea,
                    ProjectTechStack = m.Project.TechStack,
                    // Only reveal student info if confirmed
                    StudentName = m.IsConfirmed ? m.Project.Student.User.Name : null,
                    StudentEmail = m.IsConfirmed ? m.Project.Student.User.Email : null
                })
                .OrderByDescending(m => m.MatchedAt)
                .ToList();

            return Ok(matches);
        }
    }
}
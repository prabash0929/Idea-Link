using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using PAS_Project.Data;
using PAS_Project.Models;
using PAS_Project.DTOs;
using System.Security.Claims;
using System.Linq;

namespace PAS_Project.Controllers
{
    [Authorize(Roles = "Student")]
    [ApiController]
    [Route("api/student")]
    public class StudentController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StudentController(AppDbContext context)
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

        private int GetStudentId()
        {
            var userId = GetUserId();
            var student = _context.Students.FirstOrDefault(s => s.UserId == userId);
            return student?.Id ?? 0;
        }

        [HttpPost("create-project")]
        public IActionResult CreateProject([FromBody] ProjectDto projectDto)
        {
            var studentId = GetStudentId();
            if (studentId == 0) return BadRequest("Student profile not found.");

            var project = new Project
            {
                Title = projectDto.Title,
                Abstract = projectDto.Abstract,
                TechStack = projectDto.TechStack,
                ResearchArea = projectDto.ResearchArea,
                Status = "Pending",
                StudentId = studentId
            };

            _context.Projects.Add(project);
            _context.SaveChanges();
            return Ok(project);
        }

        [HttpGet("my-projects")]
        public IActionResult GetMyProjects()
        {
            var studentId = GetStudentId();
            if (studentId == 0) return BadRequest("Student profile not found.");

            var projects = _context.Projects
                .Where(p => p.StudentId == studentId)
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Abstract,
                    p.TechStack,
                    p.ResearchArea,
                    p.Status,
                    p.CreatedAt
                })
                .OrderByDescending(p => p.CreatedAt)
                .ToList();

            return Ok(projects);
        }

        [HttpPut("edit-project/{id}")]
        public IActionResult EditProject(int id, [FromBody] ProjectDto projectDto)
        {
            var studentId = GetStudentId();
            var project = _context.Projects.FirstOrDefault(p => p.Id == id && p.StudentId == studentId);

            if (project == null) return NotFound("Project not found or unauthorized.");
            if (project.Status != "Pending") return BadRequest("Only pending projects can be edited.");

            project.Title = projectDto.Title;
            project.Abstract = projectDto.Abstract;
            project.TechStack = projectDto.TechStack;
            project.ResearchArea = projectDto.ResearchArea;

            _context.SaveChanges();
            return Ok(project);
        }

        // Withdraw a pending project
        [HttpDelete("withdraw/{id}")]
        public IActionResult WithdrawProject(int id)
        {
            var studentId = GetStudentId();
            var project = _context.Projects.FirstOrDefault(p => p.Id == id && p.StudentId == studentId);

            if (project == null) return NotFound("Project not found or unauthorized.");
            if (project.Status == "Matched") return BadRequest("Cannot withdraw a matched project.");

            project.Status = "Withdrawn";
            _context.SaveChanges();
            return Ok(new { message = "Project withdrawn successfully." });
        }

        // The Reveal: Show matched supervisor info to the student
        [HttpGet("my-matches")]
        public IActionResult GetMyMatches()
        {
            var studentId = GetStudentId();
            if (studentId == 0) return BadRequest("Student profile not found.");

            var matches = _context.Matches
                .Where(m => m.IsConfirmed && m.Project.StudentId == studentId)
                .Select(m => new
                {
                    m.Id,
                    m.ProjectId,
                    ProjectTitle = m.Project.Title,
                    ProjectArea = m.Project.ResearchArea,
                    SupervisorName = m.Supervisor.User.Name,
                    SupervisorEmail = m.Supervisor.User.Email,
                    SupervisorExpertise = m.Supervisor.Expertise,
                    m.MatchedAt
                })
                .ToList();

            return Ok(matches);
        }
    }
}
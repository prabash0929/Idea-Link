using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using PAS_Project.Data;
using PAS_Project.Models;
using PAS_Project.DTOs;
using BCrypt.Net;

namespace PAS_Project.Controllers
{
    [Authorize(Roles = "SysAdmin")]
    [ApiController]
    [Route("api/sysadmin")]
    public class SysAdminController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SysAdminController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("users")]
        public IActionResult GetUsers()
        {
            return Ok(_context.Users.Select(u => new { u.Id, u.Name, u.Email, u.Role }).ToList());
        }

        // Create user account
        [HttpPost("users")]
        public IActionResult CreateUser([FromBody] CreateUserDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest("Email and Password are required.");

            if (_context.Users.Any(u => u.Email == dto.Email))
                return BadRequest("Email already exists.");

            var validRoles = new[] { "Student", "Supervisor", "Admin", "SysAdmin" };
            if (!validRoles.Contains(dto.Role))
                return BadRequest("Invalid role specified.");

            var user = new User
            {
                Name = dto.Name,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = dto.Role
            };

            _context.Users.Add(user);
            _context.SaveChanges();

            // Create role-linked entity
            if (dto.Role == "Student")
            {
                _context.Students.Add(new Student { UserId = user.Id });
            }
            else if (dto.Role == "Supervisor")
            {
                _context.Supervisors.Add(new Supervisor { UserId = user.Id, Expertise = "" });
            }

            _context.SaveChanges();

            return Ok(new { message = "User created successfully.", user = new { user.Id, user.Name, user.Email, user.Role } });
        }

        [HttpDelete("users/{id}")]
        public IActionResult DeleteUser(int id)
        {
            var user = _context.Users.Find(id);
            if (user == null) return NotFound();

            if (user.Role == "Student")
            {
                var student = _context.Students.FirstOrDefault(s => s.UserId == user.Id);
                if (student != null)
                {
                    // Remove student's projects and related matches
                    var projects = _context.Projects.Where(p => p.StudentId == student.Id).ToList();
                    foreach (var project in projects)
                    {
                        var matches = _context.Matches.Where(m => m.ProjectId == project.Id).ToList();
                        _context.Matches.RemoveRange(matches);
                    }
                    _context.Projects.RemoveRange(projects);
                    _context.Students.Remove(student);
                }
            }
            else if (user.Role == "Supervisor")
            {
                var supervisor = _context.Supervisors.FirstOrDefault(s => s.UserId == user.Id);
                if (supervisor != null)
                {
                    // Remove supervisor's matches and reset project statuses
                    var matches = _context.Matches.Where(m => m.SupervisorId == supervisor.Id).ToList();
                    foreach (var match in matches)
                    {
                        var project = _context.Projects.Find(match.ProjectId);
                        if (project != null) project.Status = "Pending";
                    }
                    _context.Matches.RemoveRange(matches);
                    _context.Supervisors.Remove(supervisor);
                }
            }

            _context.Users.Remove(user);
            _context.SaveChanges();
            return Ok(new { message = "User deleted successfully" });
        }

        [HttpPost("migrate")]
        public IActionResult MigrateDatabase()
        {
            try
            {
                _context.Database.Migrate();
                return Ok(new { message = "Database Migrations Applied Successfully" });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Migration failed", error = ex.Message });
            }
        }
    }
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using PAS_Project.Data;
using PAS_Project.Models;
using PAS_Project.Services;
using PAS_Project.DTOs;
using BCrypt.Net;
using System.Linq;

namespace PAS_Project.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly TokenService _tokenService;

        public AuthController(AppDbContext context, TokenService tokenService)
        {
            _context = context;
            _tokenService = tokenService;

            // Simple seeding for SysAdmin and Admin for testing purposes if not exists
            if (!_context.Users.Any(u => u.Role == "SysAdmin"))
            {
                _context.Users.Add(new User
                {
                    Name = "System Administrator",
                    Email = "sysadmin@pas.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("SysAdmin123!"),
                    Role = "SysAdmin"
                });
                _context.SaveChanges();
            }

            if (!_context.Users.Any(u => u.Role == "Admin"))
            {
                _context.Users.Add(new User
                {
                    Name = "General Admin",
                    Email = "admin@pas.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                    Role = "Admin"
                });
                _context.SaveChanges();
            }
        }

        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterDto dto)
        {
            if (_context.Users.Any(u => u.Email == dto.Email))
            {
                return BadRequest("Email already exists");
            }

            var user = new User
            {
                Name = dto.Name,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = dto.Role
            };

            _context.Users.Add(user);
            _context.SaveChanges();

            if (dto.Role == "Student")
            {
                _context.Students.Add(new Student { UserId = user.Id });
            }
            else if (dto.Role == "Supervisor")
            {
                // In a real app we'd get Expertise from dto, here we set default
                _context.Supervisors.Add(new Supervisor { UserId = user.Id, Expertise = "General AI/ML" });
            }

            _context.SaveChanges();

            return Ok(new { message = "Registered successfully" });
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginDto dto)
        {
            var user = _context.Users.FirstOrDefault(x => x.Email == dto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return Unauthorized("Invalid credentials");

            var token = _tokenService.CreateToken(user);
            return Ok(new { 
                token = token, 
                user = new { user.Id, user.Name, user.Email, user.Role }
            });
        }
    }
}
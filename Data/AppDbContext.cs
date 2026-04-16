using Microsoft.EntityFrameworkCore;
using PAS_Project.Models;

namespace PAS_Project.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Student> Students { get; set; }
        public DbSet<Supervisor> Supervisors { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<Match> Matches { get; set; }
        public DbSet<ResearchArea> ResearchAreas { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Student -> User
            modelBuilder.Entity<Student>()
                .HasOne(s => s.User)
                .WithMany()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Project -> Student
            modelBuilder.Entity<Project>()
                .HasOne(p => p.Student)
                .WithMany()
                .HasForeignKey(p => p.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            // Supervisor -> User
            modelBuilder.Entity<Supervisor>()
                .HasOne(s => s.User)
                .WithMany()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Match -> Project (restrict to prevent cascade cycles)
            modelBuilder.Entity<Match>()
                .HasOne(m => m.Project)
                .WithMany()
                .HasForeignKey(m => m.ProjectId)
                .OnDelete(DeleteBehavior.Restrict);

            // Match -> Supervisor (restrict to prevent cascade cycles)
            modelBuilder.Entity<Match>()
                .HasOne(m => m.Supervisor)
                .WithMany()
                .HasForeignKey(m => m.SupervisorId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
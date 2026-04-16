namespace PAS_Project.Models
{
    public class Project
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Abstract { get; set; }
        public string TechStack { get; set; }
        public string ResearchArea { get; set; }
        public string Status { get; set; } = "Pending"; // Pending, Under Review, Matched, Withdrawn
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public int StudentId { get; set; }
        public Student Student { get; set; }
    }
}
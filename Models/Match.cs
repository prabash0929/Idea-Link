namespace PAS_Project.Models
{
    public class Match
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        public int SupervisorId { get; set; }
        public bool IsConfirmed { get; set; }
        public DateTime MatchedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        public Project Project { get; set; }
        public Supervisor Supervisor { get; set; }
    }
}
namespace PAS_Project.Models
{ 
    public class Supervisor
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Expertise { get; set; }
        public User User { get; set; }
    }
}
using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PAS_Project.Migrations
{
    /// <inheritdoc />
    public partial class IdeaLinkUpdate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Projects",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "MatchedAt",
                table: "Matches",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateIndex(
                name: "IX_Matches_ProjectId",
                table: "Matches",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Matches_SupervisorId",
                table: "Matches",
                column: "SupervisorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Matches_Projects_ProjectId",
                table: "Matches",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Matches_Supervisors_SupervisorId",
                table: "Matches",
                column: "SupervisorId",
                principalTable: "Supervisors",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Matches_Projects_ProjectId",
                table: "Matches");

            migrationBuilder.DropForeignKey(
                name: "FK_Matches_Supervisors_SupervisorId",
                table: "Matches");

            migrationBuilder.DropIndex(
                name: "IX_Matches_ProjectId",
                table: "Matches");

            migrationBuilder.DropIndex(
                name: "IX_Matches_SupervisorId",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "MatchedAt",
                table: "Matches");
        }
    }
}

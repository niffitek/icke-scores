import api from "@/lib/api";

class TeamsService {
    static async getTeams() {
        const response = await api.get("?path=teams");
        return response.data;
    }

    static async getTeam(id: string) {
        const response = await api.get("?path=teams");
        const teams = response.data;
        return teams.find((team: any) => team.id === id);
    }

    static async createTeam(team: any) {
        const token = localStorage.getItem("adminToken");
        const response = await api.post("?path=teams", team, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    }

    static async updateTeam(id: string, team: any) {
        const token = localStorage.getItem("adminToken");
        const response = await api.put("?path=teams", team, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    }

    static async deleteTeam(id: string) {
        const token = localStorage.getItem("adminToken");
        const response = await api.delete(`?path=teams&id=${id}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    }

    static async getTeamsByCupId(cupId: string) {
        const response = await api.get(`?path=teams`);
        const teams = response.data;
        return teams.filter((team: any) => team.icke_cup_id === cupId);
    }

    static async getTeamsByGroupId(groupId: string) {
        // First, get all group_teams relationships
        const groupTeamsResponse = await api.get("?path=group_teams");
        const groupTeams = groupTeamsResponse.data;
        
        // Filter by the specific groupId
        const teamIds = groupTeams
            .filter((groupTeam: any) => groupTeam.group_id === groupId)
            .map((groupTeam: any) => groupTeam.team_id);
        
        if (teamIds.length === 0) {
            return [];
        }
        
        // Get all teams and filter by the team IDs we found
        const teamsResponse = await api.get("?path=teams");
        const allTeams = teamsResponse.data;
        
        return allTeams.filter((team: any) => teamIds.includes(team.id));
    }
}

export default TeamsService;
import api from "@/lib/api";

class GroupTeamsService {
    static async getGroupTeams() {
        const response = await api.get("?path=group_teams");
        return response.data;
    }

    static async getGroupTeamsByGroupId(groupId: string) {
        const response = await api.get("?path=group_teams");
        const groupTeams = response.data;
        return groupTeams.filter((groupTeam: any) => groupTeam.group_id === groupId);
    }

    static async getGroupTeamsByTeamId(teamId: string) {
        const response = await api.get("?path=group_teams");
        const groupTeams = response.data;
        return groupTeams.filter((groupTeam: any) => groupTeam.team_id === teamId);
    }

    static async createGroupTeam(groupTeam: any) {
        const token = localStorage.getItem("adminToken");
        const response = await api.post("?path=group_teams", groupTeam, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    }

    static async createMultipleGroupTeams(groupTeams: any[]) {
        const token = localStorage.getItem("adminToken");
        const responses = await Promise.all(
            groupTeams.map(groupTeam => api.post("?path=group_teams", groupTeam, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }))
        );
        return responses.map(response => response.data);
    }

    static async deleteGroupTeam(teamId: string) {
        const token = localStorage.getItem("adminToken");
        const response = await api.delete(`?path=group_teams&team_id=${teamId}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    }
}

export default GroupTeamsService; 
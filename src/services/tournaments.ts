import api from "@/lib/api";

class TournamentsService {
    static async getTournaments() {
        const response = await api.get("?path=tournaments");
        return response.data;
    }

    static async getTournament(id: string) {
        const response = await api.get("?path=tournaments");
        const tournaments = response.data;
        return tournaments.find((tournament: any) => tournament.id === id);
    }

    static async createTournament(tournament: any) {
        const token = localStorage.getItem("adminToken");
        const response = await api.post("?path=tournaments", tournament, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    }

    static async updateTournament(id: string, tournament: any) {
        const token = localStorage.getItem("adminToken");
        const response = await api.put(`?path=tournaments`, { ...tournament, id }, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    }

    static async deleteTournament(id: string) {
        const token = localStorage.getItem("adminToken");
        const response = await api.delete(`?path=tournaments&id=${id}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    }

    static async getTournamentsByCupId(cupId: string) {
        const response = await api.get("?path=tournaments");
        const tournaments = response.data;
        return tournaments.filter((tournament: any) => tournament.icke_cup_id === cupId);
    }
}

export default TournamentsService;
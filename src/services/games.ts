import api from "@/lib/api";

class GamesService {
    static async getGames() {
        const response = await api.get("?path=games");
        return response.data;
    }

    static async getGame(id: string) {
        const response = await api.get("?path=games");
        const games = response.data;
        return games.find((game: any) => game.id === id);
    }

    static async createGame(game: any) {
        const token = localStorage.getItem("adminToken");
        const response = await api.post("?path=games", game, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    }

    static async updateGame(id: string, game: any) {
        const token = localStorage.getItem("adminToken");
        const response = await api.put(`?path=games`, { ...game, id }, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    }

    static async deleteGame(id: string) {
        const token = localStorage.getItem("adminToken");
        const response = await api.delete(`?path=games&id=${id}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    }

    static async getGamesByCupId(cupId: string) {
        const response = await api.get("?path=games");
        const games = response.data;
        return games.filter((game: any) => game.icke_cup_id === cupId);
    }

    static async createMultipleGames(games: any[]) {
        const token = localStorage.getItem("adminToken");
        const responses = await Promise.all(
            games.map(game => api.post("?path=games", game, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }))
        );
        return responses.map(response => response.data);
    }
}

export default GamesService;
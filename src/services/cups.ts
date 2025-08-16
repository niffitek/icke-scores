import api from "@/lib/api";

class CupsService {
    static async getCups() {
        const response = await api.get("?path=cups");
        return response.data;
    }

    static async getCup(id: string) {
        const response = await api.get("?path=cups");
        const cups = response.data;
        return cups.find((cup: any) => cup.id === id);
    }

    static async createCup(cup: any) {
        const token = localStorage.getItem("adminToken");
        const response = await api.post("?path=cups", cup, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    }

    static async updateCup(id: string, cup: any) {
        const token = localStorage.getItem("adminToken");
        const cupData = { ...cup, id };
        const response = await api.put("?path=cups", cupData, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    }

    static async deleteCup(id: string) {
        const token = localStorage.getItem("adminToken");
        const response = await api.delete(`?path=cups&id=${id}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    }

    static async getActiveCup() {
        const response = await api.get("?path=cups");
        const cups = response.data;
        return cups.find((cup: any) => cup.state === "Vorrunde" || cup.state === "Finalrunde");
    }
}

export default CupsService;
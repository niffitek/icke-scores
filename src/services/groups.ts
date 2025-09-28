import api from "@/lib/api";

class GroupsService {
    static async getGroups() {
        const response = await api.get("?path=groups");
        return response.data;
    }

    static async getGroupsByCupId(cupId: string) {
        const response = await api.get(`?path=groups&icke_cup_id=${cupId}`);
        return response.data;
    }

    static async createGroup(group: any) {
        const token = localStorage.getItem("adminToken");
        const response = await api.post("?path=groups", group, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    }

    static async updateGroup(id: string, group: any) {
        const token = localStorage.getItem("adminToken");
        const response = await api.put(`?path=groups`, { ...group, id }, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    }

    static async deleteGroup(id: string) {
        const token = localStorage.getItem("adminToken");
        const response = await api.delete(`?path=groups&id=${id}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    }
}

export default GroupsService;
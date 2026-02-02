import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import dspaceService from "../services/dspaceService";
import ResourceTable from "./ResourceTable";

export default function Profile() {
    const { user } = useAuth();
    console.log("🚀 ~ Profile ~ user:", user);

    const [submissions, setSubmissions] = useState([]);

    const fetchMySubmissions = useCallback(async () => {
        try {
            const response = await dspaceService.getMySubmissions(user.id);
            console.log("🚀 ~ Profile ~ response:", response);
        } catch (error) { }
    }, [user]);

    useEffect(() => {
        fetchMySubmissions();
    }, [fetchMySubmissions]);

    return (
        <div className="container mx-auto mt-10">
            <ResourceTable resources={submissions} />
        </div>
    );
}

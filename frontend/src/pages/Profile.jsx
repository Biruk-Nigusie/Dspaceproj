import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import dspaceService from "../services/dspaceService";
import ResourceTable from "./ResourceTable";

export default function Profile() {
	const { user } = useAuth();

	const [submissions, setSubmissions] = useState([]);

	const fetchMySubmissions = useCallback(async () => {
		try {
			await dspaceService.getMySubmissions(user.id);
		} catch {}
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

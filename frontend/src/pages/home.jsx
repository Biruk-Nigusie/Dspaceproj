import { StatsCard, statsData } from "@/components/stats-card";
import ResourceTable from "@/pages/resource-table";
import { ORG_NAME } from "@/utils/constants";

const Home = () => {
	return (
		<div className="divide-y">
			{/* Table section */}
			<section className="container mx-auto py-24">
				<ResourceTable />
			</section>

			{/* Stats Section */}
			<section className="container mx-auto py-24">
				<div className="text-center mb-12">
					<h2 className="text-4xl font-bold text-gray-900 mb-4">
						{`${ORG_NAME} ቁጥራዊ መረጃዎች`}
					</h2>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center">
					{statsData.map((stat) => (
						<StatsCard key={stat.title} {...stat} />
					))}
				</div>
			</section>
		</div>
	);
};

export default Home;

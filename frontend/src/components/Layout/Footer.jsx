import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import { ORG_NAME } from "../../utils/constants";

const Footer = () => {
	return (
		<footer className="bg-primary  py-8 mt-auto text-white">
			<div className="max-w-7xl mx-auto px-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					<div>
						<img
							src="/images/crrsa-logo.jpg"
							className="size-24"
							alt="CRRSA logo"
						/>
					</div>

					<div>
						<h4 className="font-semibold mb-4 text-primary-foreground/60">
							ከእኛ ጋር ይገናኙ
						</h4>
						<div className="text-sm space-y-2">
							<p className="flex flex-row items-center gap-2">
								<MailIcon size={16} />
								<span>info@aacrrsa.gov.et</span>
							</p>
							<p className="flex flex-row items-center gap-2">
								<PhoneIcon size={16} />
								<span>7533</span>
							</p>
							<p className="flex flex-row items-center gap-2">
								<MapPinIcon size={16} />
								<span>
									Tunisia road or Addisu Gebeya, Addis Ababa, Ethiopia
								</span>
							</p>
						</div>
					</div>
				</div>

				<div className="border-t border-muted-foreground mt-8 pt-4 text-center text-sm">
					<p className="text-muted">{ORG_NAME}</p>
				</div>
			</div>
		</footer>
	);
};

export default Footer;

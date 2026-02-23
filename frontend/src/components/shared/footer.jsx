import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ORG_NAME } from "@/utils/constants";

export default function Footer() {
	return (
		<footer className="bg-primary py-8 text-primary-foreground">
			<div className="container mx-auto">
				<div className="flex justify-between items-center">
					<img
						src="/images/crrsa-logo.jpg"
						className="size-24"
						alt="CRRSA logo"
					/>

					<div className="flex flex-col justify-center gap-4">
						<p className="flex flex-row items-center gap-2">
							<MapPinIcon size={16} />
							<span>Tunisia road or Addisu Gebeya, Addis Ababa, Ethiopia</span>
						</p>
						<p className="flex flex-row items-center gap-2">
							<MailIcon size={16} />
							<span>info@aacrrsa.gov.et</span>
						</p>
						<p className="flex flex-row items-center gap-2">
							<PhoneIcon size={16} />
							<span>7533</span>
						</p>
					</div>
				</div>

				<Separator className="bg-primary-foreground/20 my-8" />

				<div className="text-center text-sm">
					<p className="text-primary-foreground/70">{ORG_NAME}</p>
				</div>
			</div>
		</footer>
	);
}

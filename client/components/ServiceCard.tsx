import { LucideIcon } from "lucide-react";

interface ServiceCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
}

export default function ServiceCard({ icon: Icon, title, description }: ServiceCardProps) {
    return (
        <div className="group p-8 bg-gray-50 border border-gray-100 hover:border-primary/50 transition-colors">
            <div className="mb-6">
                <Icon className="w-10 h-10 text-primary stroke-1" />
            </div>
            <h3 className="text-xl font-bold font-mono uppercase mb-4 tracking-tight">{title}</h3>
            <p className="text-gray-500 leading-relaxed text-sm">
                {description}
            </p>
        </div>
    );
}

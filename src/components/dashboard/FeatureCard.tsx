import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const colorClasses = {
  blue: { bg: "from-blue-500 to-blue-600", badge: "bg-blue-100 text-blue-700" },
  green: { bg: "from-green-500 to-green-600", badge: "bg-green-100 text-green-700" },
  purple: { bg: "from-purple-500 to-purple-600", badge: "bg-purple-100 text-purple-700" }
};

export default function FeatureCard({ icon: Icon, title, description, step, color, link }) {
  const content = (
    <Card className="h-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-none group cursor-pointer">
      <CardHeader>
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClasses[color].bg} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <Badge className={`${colorClasses[color].badge} text-lg px-3 py-1`}>
            {step}
          </Badge>
        </div>
        <CardTitle className="text-xl font-bold group-hover:text-blue-600 transition-colors">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 leading-relaxed mb-4">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {link ? <Link to={link}>{content}</Link> : <div>{content}</div>}
    </motion.div>
  );
}
import React from "react";
import { Card, CardContent } from "../ui/card";
import { motion } from "framer-motion";

const colorClasses = {
  blue: "from-blue-500 to-blue-600",
  green: "from-green-500 to-green-600",
  purple: "from-purple-500 to-purple-600",
  orange: "from-orange-500 to-orange-600"
};

export default function StatsCard({ icon: Icon, label, value, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-lg border-none hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-2">{label}</p>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} bg-opacity-10`}>
              <Icon className={`w-6 h-6 text-${color}-600`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
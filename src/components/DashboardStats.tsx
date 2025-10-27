const DashboardStats = () => {
  const stats = [
    {
      label: "Total Registrations",
      value: "5",
      color: "bg-blue-500"
    },
    {
      label: "Verified Items",
      value: "5",
      color: "bg-green-500"
    },
    {
      label: "Trust Score",
      value: "4.8/5",
      color: "bg-purple-500"
    },
    {
      label: "Network Status",
      value: "Active",
      color: "bg-orange-500"
    }
  ];

  return (
    <section className="py-12 px-6 -mt-16 relative z-10">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <div className={`w-12 h-12 ${stat.color} rounded-xl`} />
              </div>
              <div className="text-3xl font-bold">{stat.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DashboardStats;

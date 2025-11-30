import * as React from "react";

import { cn } from "@/lib/utils";

const Card = ({ children, className, ...props }) => (
  <div className={cn("bg-white shadow-md rounded-lg p-6", className)} {...props}>
    {children}
  </div>
);

const CardHeader = ({ children, className, ...props }) => (
  <div className={cn("font-bold text-lg mb-2", className)} {...props}>
    {children}
  </div>
);

const CardContent = ({ children, className, ...props }) => (
  <div className={cn("text-gray-700", className)} {...props}>
    {children}
  </div>
);

const CardFooter = ({ children, className, ...props }) => (
  <div className={cn("mt-4", className)} {...props}>
    {children}
  </div>
);

export { Card, CardHeader, CardContent, CardFooter };

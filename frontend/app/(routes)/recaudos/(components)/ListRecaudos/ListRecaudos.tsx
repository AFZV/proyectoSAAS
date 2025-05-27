"use client";

import React, { useEffect, useState } from "react";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import axios from "axios";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/Loading";

export function ListRecaudos() {
  const { user } = useUser();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const userId = user.id;

        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/recibos`,
          {
            headers: {
              Authorization: userId,
            },
          }
        );

        setData(res.data);
      } catch (error) {
        console.error("Error al cargar recibos:", error);
        toast({
          title: "Error al cargar los recibos",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [data, user, toast]);

  if (loading) return <Loading title="Cargando recibos..." />;

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={data} />
    </div>
  );
}

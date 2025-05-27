///
"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HeaderPanelsProps } from "./HeaderPanels.type";

export function HeaderPanels(props: HeaderPanelsProps) {
  const { buttonLabel, children, dialogTitle, title, dialogDescription } =
    props;
  const [openModalCreate, setOpenModalCreate] = useState(false);
  return (
    <div className="flex justify-between items-center ">
      <h2>{title}</h2>
      <Dialog open={openModalCreate} onOpenChange={setOpenModalCreate}>
        <DialogTrigger asChild>
          <Button>{buttonLabel} </Button>
        </DialogTrigger>
        <DialogContent className="sm: max-w-[625px]">
          <DialogHeader>
            <DialogTitle> {dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          {children(setOpenModalCreate)}
        </DialogContent>
      </Dialog>
    </div>
  );
}

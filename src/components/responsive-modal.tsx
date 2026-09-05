import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";

type ResponsiveModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  trigger?: React.ReactElement;
  children: React.ReactNode;
};

export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  trigger,
  children,
}: ResponsiveModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger && <DialogTrigger render={trigger} />}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  /*
   * `repositionInputs` is left at vaul's default (on). It had been switched
   * off since #21; with it off, focusing a field hands the job to the browser,
   * which on a phone pans the whole fixed drawer to chase the keyboard and
   * sometimes leaves it stranded high on the screen. vaul's repositioning is
   * built for exactly this: it resizes the drawer to the visual viewport and
   * keeps the focused input sitting just above the keyboard.
   */
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-6">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/components/utilities';
import {
  useCreateChapter,
  useCreateCollectionChapter,
  useChapters,
} from '@/hooks/data';

interface AddChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  onAddChapter: () => void;
}

const newChapterSchema = z.object({
  name: z.string().min(1, 'Chapter name is required'),
  description: z.string().optional(),
  color: z.string().optional(),
  content: z.string().min(1, 'Initial content is required'),
});

export const AddChapterDialog = ({
  open,
  onOpenChange,
  collectionId,
  onAddChapter,
}: AddChapterDialogProps) => {
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    null,
  );
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const { data: chapters = [], isLoading: isLoadingChapters } = useChapters();
  const addChapter = useCreateCollectionChapter();

  const createChapter = useCreateChapter();

  const form = useForm<z.infer<typeof newChapterSchema>>({
    resolver: zodResolver(newChapterSchema),
    defaultValues: {
      name: '',
      description: '',
      color: undefined,
      content: '# New Page Title\n\nStart writing your content here...',
    },
  });

  const handleAddExistingChapter = async () => {
    if (!selectedChapterId) {
      toast.error('Please select a chapter to add');
      return;
    }

    try {
      await addChapter.mutateAsync({
        collectionId,
        chapterId: selectedChapterId,
      });
      onAddChapter();
      toast.success('Chapter added to collection');
      setSelectedChapterId(null);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to add chapter to collection');
    }
  };

  const onSubmitNewChapter = async (
    values: z.infer<typeof newChapterSchema>,
  ) => {
    try {
      const newChapter = await createChapter.mutateAsync({
        name: values.name,
        description: values.description,
        color: values.color,
        initialPage: {
          content: values.content,
        },
      });

      await addChapter.mutateAsync({
        collectionId,
        chapterId: newChapter.id,
        order: 0,
      });

      toast.success('New chapter created and added to collection');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create new chapter');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form state when dialog closes
      setSelectedChapterId(null);
      form.reset();
      setActiveTab('existing');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Chapter to Collection</DialogTitle>
          <DialogDescription>
            Add an existing chapter or create a new one for this collection.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          className="w-full"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'existing' | 'new')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Existing Chapter</TabsTrigger>
            <TabsTrigger value="new">New Chapter</TabsTrigger>
          </TabsList>

          <TabsContent className="space-y-4 py-4" value="existing">
            <div className="space-y-4">
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between"
                    disabled={isLoadingChapters}
                    role="combobox"
                    variant="outline"
                  >
                    {selectedChapterId
                      ? chapters.find(
                          (chapter) => chapter.id === selectedChapterId,
                        )?.name || 'Select chapter...'
                      : 'Select chapter...'}
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] p-0 sm:w-[500px]">
                  <Command>
                    <CommandInput
                      className="h-9"
                      placeholder="Search chapters..."
                    />
                    <CommandList>
                      <CommandEmpty>No chapters found.</CommandEmpty>
                      <CommandGroup>
                        {chapters.map((chapter) => (
                          <CommandItem
                            key={chapter.id}
                            value={chapter.id}
                            onSelect={() => {
                              setSelectedChapterId(chapter.id);
                              setComboboxOpen(false);
                            }}
                          >
                            <div
                              className="flex w-full items-center"
                              style={{
                                borderLeft: chapter.color
                                  ? `3px solid ${chapter.color}`
                                  : undefined,
                                paddingLeft: chapter.color ? '8px' : undefined,
                              }}
                            >
                              <div className="flex-1">
                                <p className="font-medium">{chapter.name}</p>
                                {chapter.description && (
                                  <p className="line-clamp-1 text-sm text-muted-foreground">
                                    {chapter.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Check
                              className={cn(
                                'ml-auto h-4 w-4',
                                selectedChapterId === chapter.id
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </TabsContent>

          <TabsContent className="space-y-4 py-4" value="new">
            <Form {...form}>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit(onSubmitNewChapter)}
              >
                <div className="flex items-center gap-3">
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ColorPicker
                            value={field.value || null}
                            onChange={(color) =>
                              field.onChange(color || undefined)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Chapter Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          className="resize-none"
                          placeholder="Brief chapter description..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Page Content</FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[200px] font-mono text-sm"
                          placeholder="Start writing your content here..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          {activeTab === 'existing' ? (
            <Button
              disabled={!selectedChapterId || addChapter.isPending}
              onClick={handleAddExistingChapter}
            >
              {addChapter.isPending ? 'Adding...' : 'Add to Collection'}
            </Button>
          ) : (
            <Button
              disabled={createChapter.isPending || addChapter.isPending}
              onClick={form.handleSubmit(onSubmitNewChapter)}
            >
              {createChapter.isPending || addChapter.isPending
                ? 'Creating...'
                : 'Create & Add'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

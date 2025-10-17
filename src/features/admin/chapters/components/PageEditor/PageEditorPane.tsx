import './PageEditorPane.css';
import { Plus, Youtube, Image as ImageIcon } from 'lucide-react';
import { useRef, useEffect, useState, forwardRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlayAlongIcon } from '@/components/ui/icons/play-along-icon';
import { Input } from '@/components/ui/input';
import { RhythmIcon } from '@/components/ui/icons/rhythm-icon';
import { YouTubeMarkdownHelper } from '@/features/admin/chapters/components';
import { InsertImageModal } from '@/features/admin/chapters/components/InsertImageModal';
import { SelectPhraseMapModal } from '@/features/admin/phraseMaps/components/SelectPhraseMapModal';
import { PlayAlongMarkdownHelper } from '@/features/admin/playAlongs/components';
import { PlayIcon } from '@/components/ui/icons/play-icon';
import { SelectGamesModal } from '@/features/admin/games/SelectGamesModal';
interface PageEditorPaneProps {
  name: string;
  setName: (name: string) => void;
  content: string;
  setContent: (content: string) => void;
  color: string | null;
  setColor: (color: string | null) => void;
  isSaving: boolean;
  lastSaved?: Date | null;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
}

export const PageEditorPane = forwardRef<HTMLDivElement, PageEditorPaneProps>(
  (
    {
      content,
      setContent,
      name,
      setName,
      color,
      setColor,
      isSaving: _isSaving,
      lastSaved: _lastSaved,
      onScroll,
    }: PageEditorPaneProps,
    ref,
  ) => {
    const [cursorPosition, setCursorPosition] = useState<{
      top: number;
      left: number;
    } | null>(null);
    const [showActionButton, setShowActionButton] = useState(false);
    const [showPhraseMapModal, setShowPhraseMapModal] = useState(false);
    const [showPlayAlongModal, setShowPlayAlongModal] = useState(false);
    const [showYouTubeModal, setShowYouTubeModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [showGameModal, setShowGameModal] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleTextareaChange = (
      e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
      setContent(e.target.value);
    };

    const handleClick = (event: React.MouseEvent<HTMLTextAreaElement>) => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;
      const { offsetLeft, offsetTop } = textarea;

      // Get click position relative to textarea
      const clickY = event.clientY - textarea.getBoundingClientRect().top;

      setCursorPosition({
        top: offsetTop + clickY,
        left: offsetLeft,
      });

      setShowActionButton(true);
    };

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          textareaRef.current &&
          !textareaRef.current.contains(event.target as Node)
        ) {
          setTimeout(() => {
            setShowActionButton(false);
          }, 1000);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);


    const handleOpenPhraseMapModal = () => {
      setShowPhraseMapModal(true);
    };

    const handleOpenPlayAlongModal = () => {
      setShowPlayAlongModal(true);
      setShowActionButton(false);
    };

    const handleOpenYouTubeModal = () => {
      setShowYouTubeModal(true);
      setShowActionButton(false);
    };

    const handleOpenImageModal = () => {
      setShowImageModal(true);
      setShowActionButton(false);
    };

    const handleOpenGamesModal = () => {
      setShowGameModal(true);
      setShowActionButton(false);
    };


    const handleInsertPhraseMap = (phraseMapId: string) => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;
      const { selectionStart } = textarea;

      // Insert the phrase map component at the cursor position
      const newContent =
        content.substring(0, selectionStart) +
        `_component:rhythmmap(${phraseMapId})_` +
        content.substring(selectionStart);

      setContent(newContent);
      setShowActionButton(false);
      setShowPhraseMapModal(false);
    };

    const handleInsertGame = (selection: { gameId: string; chords: string[] }) => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;
      const { selectionStart } = textarea;

      // Insert the game syntax at the cursor position
      const newContent =
        content.substring(0, selectionStart) +
        `_component:${selection.gameId}(${selection.chords.reduce((a,b)=>{return (a.length>3)?a+"|"+b:b},"")})_` +
        content.substring(selectionStart);

      setContent(newContent);


    };

    const handleInsertPlayAlong = (playAlongSyntax: string) => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;
      const { selectionStart } = textarea;

      // Insert the play along syntax at the cursor position
      const newContent =
        content.substring(0, selectionStart) +
        playAlongSyntax +
        content.substring(selectionStart);

      setContent(newContent);
      setShowPlayAlongModal(false);
    };

    const handleInsertYouTube = (youtubeSyntax: string) => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;
      const { selectionStart } = textarea;

      // Insert the YouTube syntax at the cursor position
      const newContent =
        content.substring(0, selectionStart) +
        youtubeSyntax +
        content.substring(selectionStart);

      setContent(newContent);
      setShowYouTubeModal(false);
    };

    const handleInsertImage = (imageSyntax: string) => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;
      const { selectionStart } = textarea;

      // Insert the image syntax at the cursor position
      const newContent =
        content.substring(0, selectionStart) +
        imageSyntax +
        content.substring(selectionStart);

      setContent(newContent);
    };

    

    return (
      <div
        ref={ref}
        className="flex h-full w-1/2 flex-1 shrink-0 flex-col overflow-auto bg-stone-500 p-4"
        onScroll={onScroll}
      >
        <div className="relative flex flex-1 flex-col pl-12">
          <div className="mb-2 flex items-center gap-4">
            <ColorPicker value={color || null} onChange={setColor} />
            <Input
              className="font-bold"
              placeholder="Page Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <TextareaAutosize
            ref={textareaRef}
            className="page-editor-textarea w-full flex-1 resize-none border-none bg-transparent px-0 text-sm shadow-none outline-none focus-visible:ring-0"
            minRows={10}
            placeholder="Write your markdown content here..."
            value={content}
            onChange={handleTextareaChange}
            onClick={handleClick}
          />

          <div
            className="absolute z-10"
            style={
              cursorPosition
                ? {
                    top: `${cursorPosition.top}px`,
                    left: `${cursorPosition.left - 40}px`, // Increased spacing from 30px to 40px
                    opacity: showActionButton ? 1 : 0,
                  }
                : {
                    top: 0,
                    left: 0,
                    opacity: 0,
                  }
            }
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="size-6 rounded-full border p-0" size="sm">
                  <Plus className="size-6 text-black" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Text Blocks</DropdownMenuLabel>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleOpenYouTubeModal}
                >
                  <Youtube className="mr-2 size-4" />
                  YouTube Video
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleOpenImageModal}
                >
                  <ImageIcon className="mr-2 size-4" />
                  Image
                </DropdownMenuItem>
                <DropdownMenuLabel>Music Components</DropdownMenuLabel>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleOpenPhraseMapModal}
                >
                  <RhythmIcon className="mr-2 size-4" />
                  Rhythm Map
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleOpenPlayAlongModal}
                >
                  <PlayAlongIcon className="mr-2 size-4" />
                  Play Along
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleOpenGamesModal}
                >
                  <PlayIcon className="mr-2 size-4"/>
                  Game
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>


        {/* Phrase Map Modal */}
        <SelectPhraseMapModal
          open={showPhraseMapModal}
          onOpenChange={setShowPhraseMapModal}
          onSelect={handleInsertPhraseMap}
        >
          <span></span>
        </SelectPhraseMapModal>

        {/* Play Along Modal */}
        <Dialog open={showPlayAlongModal} onOpenChange={setShowPlayAlongModal}>
          <DialogContent className="max-w-3xl">
            <PlayAlongMarkdownHelper onInsert={handleInsertPlayAlong} />
          </DialogContent>
        </Dialog>

        {/* YouTube Modal */}
        <Dialog open={showYouTubeModal} onOpenChange={setShowYouTubeModal}>
          <DialogContent className="max-w-3xl">
            <YouTubeMarkdownHelper onInsert={handleInsertYouTube} />
          </DialogContent>
        </Dialog>

        {/* Image Modal */}
        <InsertImageModal
          open={showImageModal}
          onInsert={handleInsertImage}
          onOpenChange={setShowImageModal}
        />

        {/* Game Modal */}
        <SelectGamesModal
          open={showGameModal}
          onSelect={handleInsertGame}
          onOpenChange={setShowGameModal}
        />

      </div>
    );
  },
);

PageEditorPane.displayName = 'PageEditorPane';

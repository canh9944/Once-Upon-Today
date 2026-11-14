'use client';
import {useEffect,useState} from 'react';
import {useEditor,EditorContent} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import {Bold,Italic,Underline,Strikethrough,List,ListOrdered,Quote,Code2,Link2,ImagePlus,Undo2,Redo2} from 'lucide-react';
import {Button} from './ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog';
import {Input} from './ui/input';
import ImageUpload from './image-upload';
import {useSite} from './site-context';
import {editorCopy} from '@/lib/editor-i18n';
import {isImageSource} from '@/lib/content';

export default function RichTextEditor({value,onChange,disabled=false}:{value:string;onChange:(html:string)=>void;disabled?:boolean}){
  const {locale,t}=useSite(),copy=editorCopy(locale);
  const [imageOpen,setImageOpen]=useState(false),[image,setImage]=useState(''),[imageAlt,setImageAlt]=useState(''),[uploading,setUploading]=useState(false),[linkOpen,setLinkOpen]=useState(false),[link,setLink]=useState('');
  const editor=useEditor({extensions:[StarterKit.configure({heading:{levels:[2,3]},link:{openOnClick:false,HTMLAttributes:{rel:'noopener noreferrer nofollow'}}}),Image.configure({allowBase64:false})],content:value,immediatelyRender:false,onUpdate:({editor})=>onChange(editor.getHTML()),editorProps:{attributes:{class:'rich-content',role:'textbox','aria-label':t.content,'aria-multiline':'true'}}});
  useEffect(()=>{editor?.setEditable(!disabled);},[disabled,editor]);
  if(!editor)return <div className="rich-editor-loading">{t.loading}</div>;
  const tools=[
    {name:copy.bold,icon:Bold,active:editor.isActive('bold'),run:()=>editor.chain().focus().toggleBold().run()},
    {name:copy.italic,icon:Italic,active:editor.isActive('italic'),run:()=>editor.chain().focus().toggleItalic().run()},
    {name:copy.underline,icon:Underline,active:editor.isActive('underline'),run:()=>editor.chain().focus().toggleUnderline().run()},
    {name:copy.strike,icon:Strikethrough,active:editor.isActive('strike'),run:()=>editor.chain().focus().toggleStrike().run()},
    {name:copy.bullet,icon:List,active:editor.isActive('bulletList'),run:()=>editor.chain().focus().toggleBulletList().run()},
    {name:copy.ordered,icon:ListOrdered,active:editor.isActive('orderedList'),run:()=>editor.chain().focus().toggleOrderedList().run()},
    {name:copy.quote,icon:Quote,active:editor.isActive('blockquote'),run:()=>editor.chain().focus().toggleBlockquote().run()},
    {name:copy.code,icon:Code2,active:editor.isActive('codeBlock'),run:()=>editor.chain().focus().toggleCodeBlock().run()},
  ];
  return <div className="rich-editor"><div role="toolbar" aria-label={t.content} className="rich-toolbar">
    {tools.map(tool=><Button key={tool.name} type="button" variant={tool.active?'secondary':'ghost'} size="icon" title={tool.name} aria-label={tool.name} aria-pressed={tool.active} disabled={disabled} onClick={tool.run}><tool.icon size={17}/></Button>)}
    <Button type="button" variant={editor.isActive('heading',{level:2})?'secondary':'ghost'} aria-label={copy.heading2} aria-pressed={editor.isActive('heading',{level:2})} disabled={disabled} onClick={()=>editor.chain().focus().toggleHeading({level:2}).run()}>H2</Button>
    <Button type="button" variant={editor.isActive('heading',{level:3})?'secondary':'ghost'} aria-label={copy.heading3} aria-pressed={editor.isActive('heading',{level:3})} disabled={disabled} onClick={()=>editor.chain().focus().toggleHeading({level:3}).run()}>H3</Button>
    <Button type="button" variant="ghost" size="icon" aria-label={copy.link} title={copy.link} disabled={disabled} onClick={()=>{setLink(editor.getAttributes('link').href||'');setLinkOpen(true);}}><Link2/></Button>
    <Button type="button" variant="ghost" size="icon" aria-label={copy.insertImage} title={copy.insertImage} disabled={disabled} onClick={()=>{setImage('');setImageAlt('');setImageOpen(true);}}><ImagePlus/></Button>
    <Button type="button" variant="ghost" size="icon" aria-label={copy.undo} title={copy.undo} disabled={disabled||!editor.can().undo()} onClick={()=>editor.chain().focus().undo().run()}><Undo2/></Button>
    <Button type="button" variant="ghost" size="icon" aria-label={copy.redo} title={copy.redo} disabled={disabled||!editor.can().redo()} onClick={()=>editor.chain().focus().redo().run()}><Redo2/></Button>
  </div><EditorContent editor={editor}/><div className="rich-counter">{editor.getText().length.toLocaleString(locale)} {copy.characters}</div>
    <Dialog open={imageOpen} onOpenChange={setImageOpen}><DialogContent closeLabel={t.close}><DialogHeader><DialogTitle>{copy.insertImage}</DialogTitle><DialogDescription>{copy.uploadHint}</DialogDescription></DialogHeader><ImageUpload value={image} onChange={setImage} onBusyChange={setUploading}/><label>{copy.imageAlt}<Input value={imageAlt} onChange={e=>setImageAlt(e.target.value)}/></label><Button type="button" disabled={!isImageSource(image)||uploading} onClick={()=>{editor.chain().focus().setImage({src:image,alt:imageAlt}).run();setImageOpen(false);}}>{copy.insert}</Button></DialogContent></Dialog>
    <Dialog open={linkOpen} onOpenChange={setLinkOpen}><DialogContent closeLabel={t.close}><DialogHeader><DialogTitle>{copy.link}</DialogTitle><DialogDescription>{copy.linkUrl}</DialogDescription></DialogHeader><Input aria-label={copy.link} value={link} onChange={e=>setLink(e.target.value)} placeholder="https://…"/><Button type="button" disabled={!!link&&!/^(https?:\/\/|mailto:)/i.test(link)} onClick={()=>{if(link)editor.chain().focus().extendMarkRange('link').setLink({href:link}).run();else editor.chain().focus().extendMarkRange('link').unsetLink().run();setLinkOpen(false);}}>{copy.insert}</Button></DialogContent></Dialog>
  </div>;
}

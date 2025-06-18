
"use client";

import React, { useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { XIcon, UploadCloudIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadZoneProps {
  onFileLoad: (fileContent: string, fileName: string, arrayBufferContent?: ArrayBuffer) => void;
  siteKey: string;
  label?: string;
  optional?: boolean;
  acceptedFileTypes?: string;
  dropInstructionText?: string;
  expectsArrayBuffer?: boolean;
}

export function FileUploadZone({
  onFileLoad,
  siteKey,
  label,
  optional = false,
  acceptedFileTypes = ".csv,text/csv,application/vnd.ms-excel", // Default
  dropInstructionText = "Trascina qui il file CSV o clicca.",
  expectsArrayBuffer = false,
}: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const handleFileProcess = useCallback((file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (expectsArrayBuffer) {
        const arrayBufferContent = e.target?.result as ArrayBuffer;
        // Check if arrayBufferContent is valid and has a byteLength > 0
        if (arrayBufferContent && arrayBufferContent.byteLength > 0) {
          onFileLoad("", file.name, arrayBufferContent);
        } else {
          console.error(`FileUploadZone (${siteKey}): ArrayBuffer vuoto o non valido per il file ${file.name}`);
          toast({
            title: "Errore di lettura file",
            description: `Il contenuto del file ${file.name} sembra essere vuoto o non leggibile come ArrayBuffer.`,
            variant: "destructive",
          });
          setFileName(null);
          setFileSize(null);
          if (fileInputRef.current) fileInputRef.current.value = ""; // Clear the input
          onFileLoad("", "", new ArrayBuffer(0)); // Notify parent with empty buffer
          return;
        }
      } else {
        const stringContent = e.target?.result as string;
        onFileLoad(stringContent, file.name);
      }
      setFileName(file.name);
      setFileSize(`${(file.size / 1024).toFixed(2)} KB`);
    };

    reader.onerror = () => {
      toast({
        title: "Errore di lettura",
        description: `Impossibile leggere il file ${file.name}.`,
        variant: "destructive",
      });
      setFileName(null);
      setFileSize(null);
    };

    if (expectsArrayBuffer) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, 'UTF-8');
    }

  }, [onFileLoad, expectsArrayBuffer, toast, siteKey]);


  const handleFileChange = useCallback((file: File | null) => {
    if (file) {
      const fileTypeIsValid = acceptedFileTypes.split(',').some(type => {
        const trimmedType = type.trim();
        return (trimmedType.startsWith('.') && file.name.toLowerCase().endsWith(trimmedType.toLowerCase())) || file.type === trimmedType;
      });

      if (!fileTypeIsValid) {
        toast({
          title: "File non valido",
          description: `DEBUG - Tipi file ricevuti dal genitore: [${acceptedFileTypes}]. Il file "${file.name}" (tipo: ${file.type || 'sconosciuto'}) non è tra questi.`,
          variant: "destructive",
          duration: 10000,
        });
        setFileName(null);
        setFileSize(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      handleFileProcess(file);
    }
  }, [acceptedFileTypes, toast, handleFileProcess]);

  const handleDragEvents = useCallback((e: React.DragEvent<HTMLDivElement>, type: 'enter' | 'over' | 'leave' | 'drop') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'enter' || type === 'over') {
      setIsDragOver(true);
    } else if (type === 'leave') {
      setIsDragOver(false);
    } else if (type === 'drop') {
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFileChange(files[0]);
        if (fileInputRef.current) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(files[0]);
            fileInputRef.current.files = dataTransfer.files;
        }
      }
    }
  }, [handleFileChange]);

  const handleReset = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); 
    setFileName(null);
    setFileSize(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onFileLoad("", "", expectsArrayBuffer ? new ArrayBuffer(0) : undefined); 
  }, [onFileLoad, expectsArrayBuffer]);

  return (
    <div>
      {label && (
        <label htmlFor={siteKey} className="block text-lg font-semibold text-foreground mb-2">
          {label} {optional && <span className="text-sm text-muted-foreground">(Opzionale)</span>}
        </label>
      )}
      <div
        className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${fileName ? 'file-loaded' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={(e) => handleDragEvents(e, 'enter')}
        onDragOver={(e) => handleDragEvents(e, 'over')}
        onDragLeave={(e) => handleDragEvents(e, 'leave')}
        onDrop={(e) => handleDragEvents(e, 'drop')}
      >
        <Input
          type="file"
          id={siteKey}
          ref={fileInputRef}
          className="hidden"
          accept={acceptedFileTypes}
          onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
        />
        {!fileName && (
          <>
            <UploadCloudIcon className="w-10 h-10 text-muted-foreground mb-2" />
            <p className="drop-instruction">{dropInstructionText}</p>
          </>
        )}
        {fileName && (
          <>
            <p className="file-info">{fileName}</p>
            {fileSize && <p className="text-xs text-muted-foreground">{fileSize}</p>}
          </>
        )}
        {fileName && (
          <Button
            variant="ghost"
            size="icon"
            className="reset-file-btn bg-destructive hover:bg-destructive/90"
            onClick={handleReset}
            title="Rimuovi file"
            aria-label="Rimuovi file"
          >
            <XIcon className="h-4 w-4 text-destructive-foreground" />
          </Button>
        )}
      </div>
    </div>
  );
}

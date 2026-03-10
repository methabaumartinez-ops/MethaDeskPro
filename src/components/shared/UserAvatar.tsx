'use client';

import React, { useRef, useState } from 'react';
import { Camera, Loader2, Save, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface UserAvatarProps {
    profileImageUrl?: string | null;
    initials: string;
    /** Tailwind size class, e.g. "h-8 w-8" or "h-20 w-20" */
    sizeClass?: string;
    /** Tailwind text size for initials, e.g. "text-xs" or "text-2xl" */
    textClass?: string;
    /** Extra classes on the avatar bubble */
    className?: string;
    /**
     * Editable mode: shows camera badge next to avatar + save/cancel bar.
     * No overlay on the image itself — image is always fully visible.
     */
    editable?: boolean;
    onUpload?: (file: File) => Promise<void>;
    onRemove?: () => Promise<void>;
    shape?: 'circle' | 'rounded';
}

export function UserAvatar({
    profileImageUrl,
    initials,
    sizeClass = 'h-8 w-8',
    textClass = 'text-xs',
    className,
    editable = false,
    onUpload,
    onRemove,
    shape = 'circle',
}: UserAvatarProps) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState(false);

    const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';
    // Show local preview while pending, else the saved photo, else nothing
    const displayUrl = previewUrl ?? profileImageUrl ?? null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const url = URL.createObjectURL(file);
        setPendingFile(file);
        setPreviewUrl(url);
    };

    const handleSave = async () => {
        if (!pendingFile || !onUpload) return;
        setSaving(true);
        try {
            await onUpload(pendingFile);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPendingFile(null);
            setPreviewUrl(null);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPendingFile(null);
        setPreviewUrl(null);
    };

    const handleRemove = async () => {
        if (!onRemove) return;
        setRemoving(true);
        try {
            await onRemove();
        } finally {
            setRemoving(false);
        }
    };

    // ── Avatar bubble — image is NEVER covered by any button ──────────────
    const avatarBubble = (
        <div
            className={cn(
                'shrink-0 overflow-hidden',
                'border-4 border-white shadow-lg',
                sizeClass,
                shapeClass,
                displayUrl ? '' : 'flex items-center justify-center bg-white',
                className
            )}
        >
            {(saving || removing) ? (
                <div className="flex items-center justify-center w-full h-full bg-white">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : displayUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={displayUrl}
                    alt={initials}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
            ) : (
                <span className={cn('font-extrabold text-primary select-none', textClass)}>
                    {initials}
                </span>
            )}
        </div>
    );

    // Non-editable: just the bubble
    if (!editable) return avatarBubble;

    // Editable: bubble + camera badge beside it + action bar + remove link
    return (
        <div className="flex flex-col gap-2">
            {/* Row: avatar + camera button beside it */}
            <div className="flex items-end gap-2">
                {avatarBubble}

                {/* Camera button — beside the avatar, never over it */}
                {!pendingFile && !saving && !removing && (
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        title="Foto hochladen"
                        className="flex items-center justify-center h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-white shadow-md transition-all hover:scale-110 active:scale-95 shrink-0 mb-1"
                    >
                        <Camera className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Hidden file input */}
            <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
            />

            {/* Action bar — only when a new file is selected */}
            {pendingFile && (
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        size="sm"
                        className="h-7 px-3 text-xs font-bold gap-1.5 shadow-sm"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Save className="h-3 w-3" />
                        )}
                        {saving ? 'Speichern...' : 'Speichern'}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-3 text-xs font-bold gap-1.5"
                        onClick={handleCancel}
                        disabled={saving}
                    >
                        <X className="h-3 w-3" />
                        Abbrechen
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-3 text-xs font-bold gap-1.5 text-muted-foreground"
                        onClick={() => fileRef.current?.click()}
                        disabled={saving}
                    >
                        <Camera className="h-3 w-3" />
                        Anderes Foto
                    </Button>
                </div>
            )}

            {/* Delete link — only when saved photo exists and no pending change */}
            {!pendingFile && profileImageUrl && onRemove && (
                <button
                    type="button"
                    onClick={handleRemove}
                    disabled={removing}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 w-fit"
                >
                    {removing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <Trash2 className="h-3 w-3" />
                    )}
                    Foto löschen
                </button>
            )}
        </div>
    );
}

/** Derives "FM" initials from vorname + nachname */
export function getUserInitials(vorname?: string, nachname?: string): string {
    const v = (vorname?.[0] || '').toUpperCase();
    const n = (nachname?.[0] || '').toUpperCase();
    return `${v}${n}` || '?';
}

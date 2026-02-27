'use client';

import { Play, Users, Lock, LockKeyhole } from "lucide-react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
}

export default function LiveCollaborationModal({ isOpen, onClose }: Props) {
    if (!isOpen) return null;

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Card */}
            <div
                className="relative bg-white dark:bg-[#232329] border border-neutral-200 dark:border-[#3d3d3d] rounded-2xl shadow-2xl p-8 w-full max-w-137.5 mx-4 flex flex-col gap-5 items-center"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-blue-400">Live Collaboration</h2>
                </div>

                {/* Description */}
                <p className="text-base text-[#1b1b1f] dark:text-[#e3e3e8] leading-relaxed">
                    Invite people to collaborate on your drawing in real time.
                </p>

                {/* E2E note */}
                <div className="flex items-start gap-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3">
                    <p className="flex items-center gap-2 text-center text-sm text-[#1b1b1f] dark:text-[#e3e3e8]">
                        <LockKeyhole size={16}/>
                        The session is end-to-end encrypted and fully private.
                    </p>
                </div>

                {/* Action */}
                <button
                    className="flex items-center justify-center gap-2 bg-blue-400 hover:bg-blue-500 active:scale-95 transition text-white dark:text-[#121212] font-medium rounded-md w-40 px-5 py-3 text-sm"
                >
                    <Play size={16} />
                    Start session
                </button>
            </div>
        </div>
    );
}
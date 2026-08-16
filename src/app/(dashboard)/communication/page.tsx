import ChatDesignPreview from "@/app/(components)/Communication/ChatDesignPreview";

// Design-only mockup — no API calls, example data hardcoded in
// ChatDesignPreview.tsx. The real, backend-wired feature is built but
// disabled until the ChatGroupMember.staff_id/user_id bug (see chat
// history) is fixed server-side — see:
//   src/app/(components)/Communication/{ChatSidebar,ChatThread,NewChatDialog,MembersDialog}.tsx
//   src/state/tageTypes/services/communicationApi.ts
//   src/state/types/chat.ts
export default function Page() {
  return <ChatDesignPreview />;
}

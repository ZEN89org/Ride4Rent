import ConversationListScreen from "@/components/common/ConversationListScreen";
import { useAuth } from "@/features/auth/hooks/useAuth";
export default function ArchivedChats() { const { user } = useAuth(); return <ConversationListScreen archived operator={user?.role === "operator"} />; }

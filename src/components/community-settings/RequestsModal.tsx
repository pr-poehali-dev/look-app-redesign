import Icon from "@/components/ui/icon";
import { JoinRequest } from "./types";

interface Props {
  requests: JoinRequest[];
  requestsLoading: boolean;
  onClose: () => void;
  onDecide: (uid: string, approve: boolean) => void;
}

const RequestsModal = ({ requests, requestsLoading, onClose, onDecide }: Props) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-[#111] rounded-t-3xl sm:rounded-3xl border border-white/10 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
          <div>
            <h3 className="text-white font-bold text-base">Заявки на вступление</h3>
            <p className="text-white/40 text-xs">Ожидают: {requests.length}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <Icon name="X" size={16} className="text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4" style={{ scrollbarWidth: "none" }}>
          {requestsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-white/40 text-sm">Пока нет заявок</div>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                {r.avatar ? (
                  <img src={r.avatar} className="w-10 h-10 rounded-full object-cover" alt={r.user_name} />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center text-white text-sm font-bold">
                    {r.user_name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="flex-1 text-white text-sm truncate">{r.user_name}</span>
                <button
                  onClick={() => onDecide(r.user_id, true)}
                  className="px-3 py-1.5 rounded-lg bg-[#fe2c55] text-white text-xs font-semibold"
                >
                  Принять
                </button>
                <button
                  onClick={() => onDecide(r.user_id, false)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold"
                >
                  Отклонить
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestsModal;

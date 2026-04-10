import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActor } from "../backend";
import type {
  Customer,
  CustomerInput,
  DashboardStats,
  Feedback,
  FeedbackInput,
  Order,
  OrderInput,
  Payment,
  PaymentInput,
  PaymentMethod,
  PaymentStatus,
} from "../backend";

function useBackendActor() {
  return useActor(createActor);
}

// ─── Seed ────────────────────────────────────────────────────────────────────

export function useSeedInitialData() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["seed"],
    queryFn: async () => {
      if (!actor) return null;
      await actor.seedInitialData();
      return true;
    },
    enabled: !!actor && !isFetching,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export function useDashboardStats() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<DashboardStats | null>({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getDashboardStats();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

// ─── Payments ────────────────────────────────────────────────────────────────

export function usePayments() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listPayments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreatePayment() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PaymentInput) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.createPayment(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdatePayment() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: bigint; input: PaymentInput }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.updatePayment(id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export function useDeletePayment() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deletePayment(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Customers ───────────────────────────────────────────────────────────────

export function useCustomers() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listCustomers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateCustomer() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomerInput) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.createCustomer(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateCustomer() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: bigint; input: CustomerInput }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.updateCustomer(id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useDeleteCustomer() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteCustomer(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Feedbacks ───────────────────────────────────────────────────────────────

export function useFeedbacks() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<Feedback[]>({
    queryKey: ["feedbacks"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listFeedbacks();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateFeedback() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: FeedbackInput) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.createFeedback(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
    },
  });
}

export function useDeleteFeedback() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteFeedback(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
    },
  });
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export function useOrders() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listOrders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateOrder() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: OrderInput) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.createOrder(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useDeleteOrder() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteOrder(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map backend PaymentStatus enum to display label */
export function paymentStatusLabel(status: PaymentStatus): string {
  const map: Record<string, string> = {
    completed: "Paid",
    pending: "Pending",
    refunded: "Refunded",
  };
  return map[status] || status;
}

/** Map backend PaymentMethod enum to display label */
export function paymentMethodLabel(method: PaymentMethod): string {
  const map: Record<string, string> = {
    upi: "UPI",
    card: "Card",
    cash: "Cash",
  };
  return map[method] || method;
}

/** Convert backend payment status to UI status key */
export function paymentStatusToUiKey(status: PaymentStatus): string {
  const map: Record<string, string> = {
    completed: "paid",
    pending: "pending",
    refunded: "refunded",
  };
  return map[status] || status;
}

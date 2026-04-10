import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface OrderInput {
    status: OrderStatus;
    createdAt: string;
    totalAmount: bigint;
    customerId: bigint;
    items: string;
    campaignType: string;
    aiDiscount: bigint;
}
export interface Feedback {
    id: bigint;
    customerName: string;
    createdAt: string;
    text: string;
    sentiment: Sentiment;
    category: FeedbackCategory;
    customerId: bigint;
    rating: bigint;
}
export interface AppointmentInput {
    service: string;
    customerName: string;
    status: AppointmentStatus;
    date: string;
    time: string;
    notes: string;
    customerId: bigint;
}
export interface Payment {
    id: bigint;
    status: PaymentStatus;
    method: PaymentMethod;
    customer: string;
    date: string;
    discount: bigint;
    items: string;
    amount: bigint;
}
export interface DashboardStats {
    activeNow: bigint;
    ordersToday: bigint;
    totalRevenue: bigint;
    totalCustomers: bigint;
}
export type Result_1 = {
    __kind__: "ok";
    ok: bigint;
} | {
    __kind__: "err";
    err: string;
};
export interface Order {
    id: bigint;
    status: OrderStatus;
    createdAt: string;
    totalAmount: bigint;
    customerId: bigint;
    items: string;
    campaignType: string;
    aiDiscount: bigint;
}
export interface CustomerInput {
    visitCount: bigint;
    name: string;
    lastVisit: string;
    totalSpent: bigint;
    segment: CustomerSegment;
    phone: string;
    avatar: string;
}
export interface Customer {
    id: bigint;
    visitCount: bigint;
    name: string;
    lastVisit: string;
    totalSpent: bigint;
    segment: CustomerSegment;
    phone: string;
    avatar: string;
}
export type Result = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export interface PaymentInput {
    status: PaymentStatus;
    method: PaymentMethod;
    customer: string;
    date: string;
    discount: bigint;
    items: string;
    amount: bigint;
}
export interface Appointment {
    id: bigint;
    service: string;
    customerName: string;
    status: AppointmentStatus;
    date: string;
    time: string;
    notes: string;
    customerId: bigint;
}
export interface FeedbackInput {
    customerName: string;
    createdAt: string;
    text: string;
    sentiment: Sentiment;
    category: FeedbackCategory;
    customerId: bigint;
    rating: bigint;
}
export enum AppointmentStatus {
    scheduled = "scheduled",
    cancelled = "cancelled",
    completed = "completed"
}
export enum CustomerSegment {
    New = "New",
    VIP = "VIP",
    Regular = "Regular",
    AtRisk = "AtRisk"
}
export enum FeedbackCategory {
    compliment = "compliment",
    complaint = "complaint",
    suggestion = "suggestion"
}
export enum OrderStatus {
    cancelled = "cancelled",
    pending = "pending",
    completed = "completed",
    confirmed = "confirmed"
}
export enum PaymentMethod {
    upi = "upi",
    card = "card",
    cash = "cash"
}
export enum PaymentStatus {
    pending = "pending",
    completed = "completed",
    refunded = "refunded"
}
export enum Sentiment {
    negative = "negative",
    positive = "positive",
    neutral = "neutral"
}
export interface backendInterface {
    createAppointment(input: AppointmentInput): Promise<Result_1>;
    createCustomer(input: CustomerInput): Promise<Result_1>;
    createFeedback(input: FeedbackInput): Promise<Result_1>;
    createOrder(input: OrderInput): Promise<Result_1>;
    createPayment(input: PaymentInput): Promise<Result_1>;
    deleteAppointment(id: bigint): Promise<Result>;
    deleteCustomer(id: bigint): Promise<Result>;
    deleteFeedback(id: bigint): Promise<Result>;
    deleteOrder(id: bigint): Promise<Result>;
    deletePayment(id: bigint): Promise<Result>;
    filterPayments(status: string | null, method: string | null): Promise<Array<Payment>>;
    getAppointment(id: bigint): Promise<Appointment | null>;
    getCustomer(id: bigint): Promise<Customer | null>;
    getCustomerPayments(customerName: string): Promise<Array<Payment>>;
    getDashboardStats(): Promise<DashboardStats>;
    getFeedback(id: bigint): Promise<Feedback | null>;
    getOrder(id: bigint): Promise<Order | null>;
    getPayment(id: bigint): Promise<Payment | null>;
    listAppointments(): Promise<Array<Appointment>>;
    listCustomers(): Promise<Array<Customer>>;
    listFeedbacks(): Promise<Array<Feedback>>;
    listOrders(): Promise<Array<Order>>;
    listPayments(): Promise<Array<Payment>>;
    searchPayments(queryText: string): Promise<Array<Payment>>;
    seedInitialData(): Promise<void>;
    updateAppointment(id: bigint, input: AppointmentInput): Promise<Result>;
    updateCustomer(id: bigint, input: CustomerInput): Promise<Result>;
    updateFeedback(id: bigint, input: FeedbackInput): Promise<Result>;
    updateOrder(id: bigint, input: OrderInput): Promise<Result>;
    updatePayment(id: bigint, input: PaymentInput): Promise<Result>;
}

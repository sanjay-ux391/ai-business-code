import Map "mo:core/Map";

import CustomerT "types/customer";
import PaymentT "types/payment";
import OrderT "types/order";
import FeedbackT "types/feedback";
import AppointmentT "types/appointment";

import CustomerApi "mixins/customer-api";
import PaymentApi "mixins/payment-api";
import OrderApi "mixins/order-api";
import FeedbackApi "mixins/feedback-api";
import AppointmentApi "mixins/appointment-api";
import DashboardApi "mixins/dashboard-api";

// persistent actor: all fields are implicitly stable — Map.Map is orthogonally persistent
persistent actor {
  // --- State (stable via orthogonal persistence) ---
  let customers    : Map.Map<Nat, CustomerT.Customer>       = Map.empty();
  let payments     : Map.Map<Nat, PaymentT.Payment>         = Map.empty();
  let orders       : Map.Map<Nat, OrderT.Order>             = Map.empty();
  let feedbacks    : Map.Map<Nat, FeedbackT.Feedback>       = Map.empty();
  let appointments : Map.Map<Nat, AppointmentT.Appointment> = Map.empty();

  // --- Mixin includes ---
  include CustomerApi(customers);
  include PaymentApi(payments);
  include OrderApi(orders);
  include FeedbackApi(feedbacks);
  include AppointmentApi(appointments);
  include DashboardApi(customers, payments, orders, feedbacks, appointments);
};

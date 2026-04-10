import Common "../types/common";
import CustomerT "../types/customer";
import PaymentT "../types/payment";
import OrderT "../types/order";
import AppointmentT "../types/appointment";
import FeedbackT "../types/feedback";
import CustomerLib "../lib/customer";
import PaymentLib "../lib/payment";
import OrderLib "../lib/order";
import AppointmentLib "../lib/appointment";
import FeedbackLib "../lib/feedback";
import Map "mo:core/Map";

mixin (
  customers : Map.Map<Nat, CustomerT.Customer>,
  payments : Map.Map<Nat, PaymentT.Payment>,
  orders : Map.Map<Nat, OrderT.Order>,
  feedbacks : Map.Map<Nat, FeedbackT.Feedback>,
  appointments : Map.Map<Nat, AppointmentT.Appointment>,
) {
  public query func getDashboardStats() : async Common.DashboardStats {
    let totalCustomers = customers.size();
    let totalRevenue = payments.foldLeft(
      0,
      func(acc, _k, p) { acc + p.amount },
    );
    let ordersToday = orders.size();
    let activeNow = (ordersToday % 5) + 1;
    {
      totalCustomers;
      totalRevenue;
      ordersToday;
      activeNow;
    };
  };

  public func seedInitialData() : async () {
    // Idempotent — skip if already seeded
    if (customers.size() > 0) { return };

    // ---- Seed 10 customers ----
    let customerSeeds : [(Text, Text, Text, Nat, Nat, Text, CustomerT.CustomerSegment)] = [
      ("Priya Sharma",  "98765-43210", "PS", 12500, 42, "2024-03-28", #VIP),
      ("Raj Kumar",     "87654-32109", "RK",  8200, 30, "2024-03-27", #Regular),
      ("Meera Nair",    "76543-21098", "MN",  3100, 12, "2024-03-20", #AtRisk),
      ("Arjun Patel",   "65432-10987", "AP", 15000, 50, "2024-03-29", #VIP),
      ("Sunita Reddy",  "54321-09876", "SR",   900,  7, "2024-03-15", #New),
      ("Vikram Singh",  "43210-98765", "VS",  6400, 22, "2024-03-26", #Regular),
      ("Lakshmi Iyer",  "32109-87654", "LI", 11200, 38, "2024-03-25", #VIP),
      ("Deepak Gupta",  "21098-76543", "DG",  2700, 10, "2024-03-18", #AtRisk),
      ("Kavya Menon",   "10987-65432", "KM",   500,  5, "2024-03-22", #New),
      ("Arun Bose",     "09876-54321", "AB",  7800, 28, "2024-03-24", #Regular),
    ];

    var cId : Nat = 1;
    for ((name, phone, avatar, totalSpent, visitCount, lastVisit, segment) in customerSeeds.values()) {
      let input : CustomerT.CustomerInput = { name; phone; avatar; totalSpent; visitCount; lastVisit; segment };
      let (_, _) = CustomerLib.create(customers, cId, input);
      cId += 1;
    };

    // ---- Seed 20 payments ----
    let paymentSeeds : [(Text, Text, Nat, PaymentT.PaymentMethod, Text, PaymentT.PaymentStatus, Nat)] = [
      ("Priya Sharma",  "Biryani, Lassi",                1450, #upi,  "2024-03-29", #completed, 100),
      ("Raj Kumar",     "Butter Chicken, Naan",           980, #card, "2024-03-28", #completed,   0),
      ("Meera Nair",    "Dal Makhani, Raita, Naan",       750, #cash, "2024-03-28", #completed,  50),
      ("Arjun Patel",   "Paneer Tikka, Biryani, Lassi",  2200, #upi,  "2024-03-27", #completed, 150),
      ("Sunita Reddy",  "Samosa, Masala Chai",            320, #cash, "2024-03-26", #completed,   0),
      ("Vikram Singh",  "Butter Chicken, Dal Makhani",   1100, #card, "2024-03-26", #completed,   0),
      ("Lakshmi Iyer",  "Biryani, Gulab Jamun",          1680, #upi,  "2024-03-25", #completed, 100),
      ("Deepak Gupta",  "Naan, Raita, Masala Chai",       580, #cash, "2024-03-25", #completed,   0),
      ("Kavya Menon",   "Samosa, Lassi",                  410, #upi,  "2024-03-24", #completed,   0),
      ("Arun Bose",     "Paneer Tikka, Naan, Lassi",     1350, #card, "2024-03-24", #completed,  50),
      ("Priya Sharma",  "Dal Makhani, Gulab Jamun",       870, #upi,  "2024-03-23", #completed,   0),
      ("Raj Kumar",     "Biryani, Raita",                1200, #cash, "2024-03-22", #pending,     0),
      ("Arjun Patel",   "Butter Chicken, Naan, Lassi",  1560, #card, "2024-03-21", #completed, 100),
      ("Vikram Singh",  "Paneer Tikka, Dal Makhani",    1380, #upi,  "2024-03-20", #completed,   0),
      ("Lakshmi Iyer",  "Biryani, Gulab Jamun, Lassi",  2100, #upi,  "2024-03-19", #completed, 150),
      ("Meera Nair",    "Masala Chai, Samosa",            390, #cash, "2024-03-18", #refunded,    0),
      ("Deepak Gupta",  "Butter Chicken, Naan",           950, #card, "2024-03-17", #completed,  50),
      ("Sunita Reddy",  "Paneer Tikka, Raita",            780, #upi,  "2024-03-16", #pending,     0),
      ("Arun Bose",     "Biryani, Masala Chai",          1300, #cash, "2024-03-15", #completed,   0),
      ("Kavya Menon",   "Dal Makhani, Gulab Jamun",       620, #card, "2024-03-14", #refunded,    0),
    ];

    var pId : Nat = 1;
    for ((customer, items, amount, method, date, status, discount) in paymentSeeds.values()) {
      let input : PaymentT.PaymentInput = { customer; items; amount; method; date; status; discount };
      let (_, _) = PaymentLib.create(payments, pId, input);
      pId += 1;
    };

    // ---- Seed 10 orders (one per customer) ----
    let orderSeeds : [(Nat, Text, Nat, OrderT.OrderStatus, Text, Nat, Text)] = [
      (1,  "Biryani, Lassi",                1450, #completed, "2024-03-29", 100, "loyalty_reward"),
      (2,  "Butter Chicken, Naan",           980, #completed, "2024-03-28",   0, "standard"),
      (3,  "Dal Makhani, Naan",              750, #completed, "2024-03-20",  50, "win_back"),
      (4,  "Paneer Tikka, Biryani",         2200, #completed, "2024-03-27", 200, "birthday_offer"),
      (5,  "Samosa, Masala Chai",            320, #pending,   "2024-03-26",   0, "standard"),
      (6,  "Butter Chicken, Dal Makhani",   1100, #confirmed, "2024-03-26",   0, "feedback_followup"),
      (7,  "Biryani, Gulab Jamun",          1680, #completed, "2024-03-25", 100, "loyalty_reward"),
      (8,  "Naan, Raita, Chai",              580, #cancelled, "2024-03-18",   0, "win_back"),
      (9,  "Samosa, Lassi",                  410, #pending,   "2024-03-22",   0, "standard"),
      (10, "Paneer Tikka, Naan, Lassi",     1350, #completed, "2024-03-24",  50, "loyalty_reward"),
    ];

    var oId : Nat = 1;
    for ((customerId, items, totalAmount, status, createdAt, aiDiscount, campaignType) in orderSeeds.values()) {
      let input : OrderT.OrderInput = { customerId; items; totalAmount; status; createdAt; aiDiscount; campaignType };
      let (_, _) = OrderLib.create(orders, oId, input);
      oId += 1;
    };

    // ---- Seed 5 feedbacks ----
    let feedbackSeeds : [(Nat, Text, Text, FeedbackT.Sentiment, Nat, Text, FeedbackT.FeedbackCategory)] = [
      (1, "Priya Sharma",  "The biryani was absolutely fantastic! Best in the city.", #positive, 5, "2024-03-28", #compliment),
      (2, "Raj Kumar",     "Service was a bit slow during peak hours, but food was great.", #neutral, 3, "2024-03-27", #suggestion),
      (3, "Meera Nair",    "My order was wrong and took 45 minutes. Very disappointing.", #negative, 1, "2024-03-20", #complaint),
      (4, "Arjun Patel",   "Paneer tikka was perfectly spiced. Will definitely return!", #positive, 5, "2024-03-27", #compliment),
      (5, "Sunita Reddy",  "Please add more vegetarian options to the menu.", #neutral, 3, "2024-03-15", #suggestion),
    ];

    var fId : Nat = 1;
    for ((customerId, customerName, text, sentiment, rating, createdAt, category) in feedbackSeeds.values()) {
      let input : FeedbackT.FeedbackInput = { customerId; customerName; text; sentiment; rating; createdAt; category };
      let (_, _) = FeedbackLib.create(feedbacks, fId, input);
      fId += 1;
    };

    // ---- Seed 5 appointments ----
    let appointmentSeeds : [(Nat, Text, Text, Text, Text, AppointmentT.AppointmentStatus, Text)] = [
      (1, "Priya Sharma",  "2024-04-05", "19:00", "Private Dining",   #scheduled,  "Anniversary dinner for 2"),
      (2, "Arjun Patel",   "2024-04-10", "13:00", "Corporate Lunch",  #scheduled,  "Team lunch for 15 people"),
      (3, "Lakshmi Iyer",  "2024-03-25", "18:30", "Birthday Party",   #completed,  "Birthday party for 20 guests"),
      (4, "Vikram Singh",  "2024-04-12", "20:00", "Dine-in",          #scheduled,  "Special occasion dinner"),
      (5, "Meera Nair",    "2024-03-18", "12:00", "Catering",         #cancelled,  "Office catering — cancelled by client"),
    ];

    var aId : Nat = 1;
    for ((customerId, customerName, date, time, service, status, notes) in appointmentSeeds.values()) {
      let input : AppointmentT.AppointmentInput = { customerId; customerName; date; time; service; status; notes };
      let (_, _) = AppointmentLib.create(appointments, aId, input);
      aId += 1;
    };
  };
};

module {
  // Sentiment variant
  public type Sentiment = {
    #positive;
    #neutral;
    #negative;
  };

  // Feedback category variant
  public type FeedbackCategory = {
    #complaint;
    #suggestion;
    #compliment;
  };

  // Feedback record (shared)
  public type Feedback = {
    id : Nat;
    customerId : Nat;
    customerName : Text;
    text : Text;
    sentiment : Sentiment;
    rating : Nat;
    createdAt : Text;
    category : FeedbackCategory;
  };

  // Input for create/update
  public type FeedbackInput = {
    customerId : Nat;
    customerName : Text;
    text : Text;
    sentiment : Sentiment;
    rating : Nat;
    createdAt : Text;
    category : FeedbackCategory;
  };
};

# GHL Workflow Setup: Automated Greeting Messages

This guide explains how to set up a GoHighLevel (GHL) workflow to automatically send a personalized greeting message to customers when they start a new chat. This ensures a better user experience and only notifies agents when a customer has a real question.

---

## Workflow Goal

- **Trigger:** Customer submits their information in the chat widget.
- **Action:** Automatically send a personalized greeting message.
- **Result:** The conversation only appears in the iKunnect agent queue **after** the customer responds to the greeting.

---

## Step-by-Step Setup in GoHighLevel

1.  **Navigate to Workflows:**
    - In your GHL account, go to the **Automation** tab and click on **Workflows**.

2.  **Create a New Workflow:**
    - Click the **+ Create workflow** button.
    - Select **Start from scratch**.

3.  **Set Up the Workflow Trigger:**
    - Click **+ Add new workflow trigger**.
    - In the trigger settings, select **Customer Replied**.
    - Add a filter: **Reply Channel** -> **is** -> **Chat Widget**.
    - Add another filter: **Message Body** -> **is** -> `Customer started a new chat` (or similar system message from your chat widget).

4.  **Add the Automated Greeting Message Action:**
    - Click the **+** icon below the trigger.
    - Select **Send Message** (or Send SMS/Email if you prefer).
    - In the message box, use the following templates and customize as needed.

---

## Greeting Message Templates

Use these templates in the "Send Message" action. You can use GHL's custom values to personalize the message.

### Template 1: Standard Greeting

```
Hi {{contact.first_name}}, thank you for visiting {{location.name}}. While we direct you to the next available agent, how can we help you today?
```

### Template 2: More Casual Greeting

```
Hey {{contact.first_name}}! Thanks for reaching out to {{location.name}}. What can we help you with?
```

### Template 3: Formal Greeting

```
Dear {{contact.first_name}},

Welcome to {{location.name}}. Our team is ready to assist you. Please let us know how we can help, and we will connect you with the right person.
```

### Randomized Variations (Advanced)

To make the greetings feel more natural, you can use GHL's **If/Else** conditions to send different messages based on certain criteria (e.g., time of day, contact tags).

**Example with If/Else:**

- **Condition:** If `current_hour` is between 9 and 17 (business hours).
    - **Then:** Send Template 1.
    - **Else:** Send a message like: "Hi {{contact.first_name}}, thanks for your message. Our office is currently closed, but we will get back to you first thing in the morning."

---

## How It Works with iKunnect

1.  **GHL sends the greeting.** This message is now stored in iKunnect with type `admin` and sender `system`.
2.  **The conversation is hidden.** The iKunnect dashboard will **not** show this conversation in the agent queue yet because it only contains the system greeting.
3.  **Customer replies.** The customer sends their actual question (e.g., "I need help with my bill").
4.  **Conversation appears.** This new message triggers the webhook, and the conversation now appears in the iKunnect agent queue, ready to be claimed.

This ensures that agents only focus on conversations where the customer has a real intent to chat, improving efficiency and response times.

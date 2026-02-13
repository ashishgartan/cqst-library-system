module.exports = {
  // MongoDB connection string
  // For local development: mongodb://localhost:27017/whatsapp_chat
  // For MongoDB Atlas: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/whatsapp_chat?retryWrites=true&w=majority
  MONGODB_URI:
    process.env.MONGODB_URI ||
    "mongodb+srv://library:2u4dUtx10o6Pf357@private-cqst-library-mongodb-01ac9450.mongo.ondigitalocean.com/chat",

  // Server port
  PORT: process.env.PORT || 3000,
};

#!/usr/bin/env node
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Environment variables:');
    console.log('MONGODB_URI:', process.env.MONGODB_URI);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    const uri = process.env.MONGODB_URI || 'mongodb://localhost/explorerDB';
    console.log('Using URI:', uri);
    
    console.log('\nConnecting to database...');
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('Connected successfully!');
    
    // Test a simple operation
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Test blocks collection
    const blocksCollection = db.collection('blocks');
    const blockCount = await blocksCollection.countDocuments();
    console.log('Block count:', blockCount);
    
    await mongoose.disconnect();
    console.log('Disconnected');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testConnection();

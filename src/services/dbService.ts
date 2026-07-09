import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  increment,
  writeBatch,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Order, Review, SystemNotification, UserProfile } from '../types';

// Seeding standard data if collections are empty
export async function seedInitialData() {
  try {
    // Seed Hostels if empty
    const hostelSnap = await getDocs(collection(db, 'hostels'));
    if (hostelSnap.empty) {
      const initialHostels = [
        'Kalpana Chawla', 'Meenakshi', 'Kaparadeivi', 'ESQ A', 'ESQ B',
        'Sannasi A', 'Sannasi C', 'Began', 'Paari (G Block)', 'Kaari (H Block)',
        'Oori (I Block)', 'Adhiyaman (J Block)', 'Nelson Mandela Hostel (NRI)',
        'Agasthiyar (Dormitory)', 'Melligai', 'Senbagam', 'N Block', 'Mullai',
        'Kopperundevi', 'Manorinjitam'
      ];
      
      const batch = writeBatch(db);
      initialHostels.forEach((name) => {
        const docRef = doc(collection(db, 'hostels'));
        batch.set(docRef, {
          id: docRef.id,
          name,
          receiver: 'Hostel Manager / Office Room',
          ordersCount: 0,
          revenue: 0
        });
      });
      await batch.commit();
      console.log('Seeded initial hostels');
    }

    // Seed Services if empty
    const serviceSnap = await getDocs(collection(db, 'services'));
    if (serviceSnap.empty) {
      const initialServices = [
        {
          name: 'A4 Assignment',
          description: 'Standard B&W A4 assignment printing & manual writing',
          price: 10,
          unit: 'page',
          features: ['Neat & Clear Writing', 'On-Time Delivery', 'Affordable Pricing']
        },
        {
          name: 'A3 Sheets',
          description: 'Large format sheets, blank, lined or graphs',
          price: 30,
          unit: 'sheet',
          features: ['High Quality Sheets', 'Perfect drawings/graphs', 'Colors available']
        },
        {
          name: 'Manuals',
          description: 'Custom lab manuals and experiment sheets',
          price: 40,
          unit: 'experiment',
          features: ['All departments', 'Pre-filled or customized option', 'Best value bundle']
        }
      ];

      const batch = writeBatch(db);
      initialServices.forEach((svc) => {
        const docRef = doc(collection(db, 'services'));
        batch.set(docRef, {
          id: docRef.id,
          ...svc
        });
      });
      await batch.commit();
      console.log('Seeded initial services');
    }
  } catch (err) {
    console.error('Error seeding initial data:', err);
  }
}

// User profile helpers
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docSnap = await getDoc(doc(db, 'users', uid));
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
}

export async function createUserProfile(uid: string, data: Omit<UserProfile, 'id' | 'points' | 'ordersCount' | 'role' | 'joined'>) {
  const userRef = doc(db, 'users', uid);
  const profile: UserProfile = {
    id: uid,
    ...data,
    points: 0,
    ordersCount: 0,
    joined: new Date().toLocaleDateString(),
    role: (data.email === 'admin@assignme.in' || data.email === 'gamblerop18@gmail.com') ? 'admin' : 'user'
  };
  await setDoc(userRef, profile);

  // Send notification for new user to Admin
  await addDoc(collection(db, 'notifications'), {
    title: 'New User Registered 👤',
    desc: `${profile.name} has joined Assign Me.`,
    type: 'user',
    createdAt: new Date().toISOString(),
    read: false
  });

  return profile;
}

// Order helpers
export async function createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'status'>) {
  const orderId = '#AM' + Math.floor(100000 + Math.random() * 900000);
  const fullOrder: Order = {
    ...orderData,
    id: orderId,
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'orders', orderId), fullOrder);

  // Increment order stats for user if logged in
  if (orderData.userId) {
    const userRef = doc(db, 'users', orderData.userId);
    await updateDoc(userRef, {
      ordersCount: increment(1)
    });
  }

  // Add notification to Admin
  await addDoc(collection(db, 'notifications'), {
    title: 'New Order Placed 📦',
    desc: `New order ${orderId} placed by ${orderData.name} (${rupees(orderData.total)})`,
    type: 'order',
    createdAt: new Date().toISOString(),
    read: false
  });

  // Add notification to User (if logged in)
  if (orderData.userId) {
    await addDoc(collection(db, 'notifications'), {
      title: 'Order Received 📝',
      desc: `Your order ${orderId} has been successfully received and is pending admin review.`,
      type: 'order',
      userId: orderData.userId,
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  // Update hostel order count if hosteller
  if (orderData.userType === 'Hosteller' && orderData.hostel) {
    const hostelSnap = await getDocs(query(collection(db, 'hostels'), where('name', '==', orderData.hostel)));
    if (!hostelSnap.empty) {
      const hostelDoc = hostelSnap.docs[0];
      await updateDoc(doc(db, 'hostels', hostelDoc.id), {
        ordersCount: increment(1),
        revenue: increment(orderData.total)
      });
    }
  }

  return fullOrder;
}

export async function updateOrderStatus(orderId: string, status: Order['status']) {
  const orderRef = doc(db, 'orders', orderId);
  await updateDoc(orderRef, { status });

  // Fetch order to send target notifications
  const snap = await getDoc(orderRef);
  if (snap.exists()) {
    const order = snap.data() as Order;
    if (order.userId) {
      // Send notification based on status
      let title = '';
      let desc = '';
      if (status === 'In Progress') {
        title = 'Order Accepted 🔄';
        desc = `Your order ${orderId} has been accepted by the admin and is currently being processed.`;
      } else if (status === 'Completed') {
        title = 'Order Completed 🎉';
        desc = `Your order ${orderId} is complete and delivered to your designated location! +50 reward points added.`;
        
        // Add completion reward points (+50)
        await updateDoc(doc(db, 'users', order.userId), {
          points: increment(50)
        });

        // Points added notification
        await addDoc(collection(db, 'notifications'), {
          title: 'Reward Points Added 🎁',
          desc: 'You earned +50 points for completing your assignment order!',
          userId: order.userId,
          type: 'system',
          createdAt: new Date().toISOString(),
          read: false
        });
      } else if (status === 'Rejected') {
        title = 'Order Rejected ❌';
        desc = `Your order ${orderId} has been cancelled/rejected. Please contact admin on WhatsApp for details.`;
      }

      if (title) {
        await addDoc(collection(db, 'notifications'), {
          title,
          desc,
          type: 'order',
          userId: order.userId,
          createdAt: new Date().toISOString(),
          read: false
        });
      }
    }
  }
}

// Standing Photo Uploads (no login required)
export async function uploadStandalonePhoto(photo: { name: string; note: string; fileName: string; size: string; dataUrl: string }) {
  const docRef = doc(collection(db, 'uploaded_photos'));
  const payload = {
    id: docRef.id,
    ...photo,
    date: new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    createdAt: new Date().toISOString()
  };
  await setDoc(docRef, payload);

  // Notify admin
  await addDoc(collection(db, 'notifications'), {
    title: 'New Assignment Photo Uploaded 📷',
    desc: `A photo was sent by ${photo.name || 'Anonymous'}.`,
    type: 'system',
    createdAt: new Date().toISOString(),
    read: false
  });

  return payload;
}

// Review helpers
export async function submitReview(reviewData: Omit<Review, 'id' | 'date'>) {
  const docRef = doc(collection(db, 'reviews'));
  const review: Review = {
    ...reviewData,
    id: docRef.id,
    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  };
  await setDoc(docRef, review);

  // If user is logged in, reward them with +20 points
  if (reviewData.userId) {
    await updateDoc(doc(db, 'users', reviewData.userId), {
      points: increment(20)
    });

    // Notify reward point addition
    await addDoc(collection(db, 'notifications'), {
      title: 'Review Bonus points added 🎁',
      desc: 'You earned +20 reward points for writing a review!',
      userId: reviewData.userId,
      type: 'system',
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  // Notify admin
  await addDoc(collection(db, 'notifications'), {
    title: 'New Customer Review Submitted ⭐',
    desc: `${review.name} left a ${review.stars}-star review.`,
    type: 'review',
    createdAt: new Date().toISOString(),
    read: false
  });

  return review;
}

function rupees(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

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

import {
  Order,
  Review,
  SystemNotification,
  UserProfile
} from '../types';


// =====================================================
// SEED INITIAL DATA
// =====================================================

export async function seedInitialData() {

  try {

    // ==============================
    // HOSTELS
    // ==============================

    const hostelSnap =
      await getDocs(
        collection(db, 'hostels')
      );

    if (hostelSnap.empty) {

      const initialHostels = [
        'Kalpana Chawla',
        'Meenakshi',
        'Kaparadeivi',
        'ESQ A',
        'ESQ B',
        'Sannasi A',
        'Sannasi C',
        'Began',
        'Paari (G Block)',
        'Kaari (H Block)',
        'Oori (I Block)',
        'Adhiyaman (J Block)',
        'Nelson Mandela Hostel (NRI)',
        'Agasthiyar (Dormitory)',
        'Melligai',
        'Senbagam',
        'N Block',
        'Mullai',
        'Kopperundevi',
        'Manorinjitam'
      ];

      const batch =
        writeBatch(db);

      initialHostels.forEach((name) => {

        const docRef =
          doc(collection(db, 'hostels'));

        batch.set(docRef, {
          id: docRef.id,
          name,
          receiver:
            'Hostel Manager / Office Room',
          ordersCount: 0,
          revenue: 0
        });
      });

      await batch.commit();

      console.log(
        'Seeded initial hostels'
      );
    }


    // ==============================
    // SERVICES
    // ==============================

    const serviceSnap =
      await getDocs(
        collection(db, 'services')
      );

    if (serviceSnap.empty) {

      const initialServices = [

        {
          name: 'A4 Assignment',
          description:
            'Standard B&W A4 assignment printing & manual writing',
          price: 10,
          unit: 'page',
          features: [
            'Neat & Clear Writing',
            'On-Time Delivery',
            'Affordable Pricing'
          ]
        },

        {
          name: 'A3 Sheets',
          description:
            'Large format sheets, blank, lined or graphs',
          price: 30,
          unit: 'sheet',
          features: [
            'High Quality Sheets',
            'Perfect drawings/graphs',
            'Colors available'
          ]
        },

        {
          name: 'Manuals',
          description:
            'Custom lab manuals and experiment sheets',
          price: 40,
          unit: 'experiment',
          features: [
            'All departments',
            'Pre-filled or customized option',
            'Best value bundle'
          ]
        }

      ];

      const batch =
        writeBatch(db);

      initialServices.forEach((svc) => {

        const docRef =
          doc(collection(db, 'services'));

        batch.set(docRef, {
          id: docRef.id,
          ...svc
        });
      });

      await batch.commit();

      console.log(
        'Seeded initial services'
      );
    }

  } catch (err) {

    console.error(
      'Error seeding initial data:',
      err
    );
  }
}


// =====================================================
// USER PROFILE
// =====================================================

export async function getUserProfile(
  uid: string
): Promise<UserProfile | null> {

  const docSnap =
    await getDoc(
      doc(db, 'users', uid)
    );

  if (docSnap.exists()) {

    return docSnap.data() as UserProfile;
  }

  return null;
}


export async function createUserProfile(
  uid: string,
  data: Omit<
    UserProfile,
    'id' |
    'points' |
    'ordersCount' |
    'role' |
    'joined'
  >
) {

  const userRef =
    doc(db, 'users', uid);

  const profile: UserProfile = {

    id: uid,

    ...data,

    points: 0,

    ordersCount: 0,

    joined:
      new Date().toLocaleDateString(),

    role: 'user'
  };

  /*
   * IMPORTANT:
   *
   * We only create the user's profile here.
   *
   * We DO NOT create an admin notification
   * from the client because your Firestore
   * rules correctly prevent normal users from
   * writing arbitrary admin notifications.
   */

  await setDoc(
    userRef,
    profile
  );

  return profile;
}


// =====================================================
// ORDERS
// =====================================================

export async function createOrder(
  orderData: Omit<
    Order,
    'id' |
    'createdAt' |
    'status'
  > & {
    id?: string
  }
) {

  const orderId =
    orderData.id ||
    '#AM' +
    Math.floor(
      100000 +
      Math.random() * 900000
    );

  const fullOrder: Order = {

    ...orderData,

    id: orderId,

    status: 'Pending',

    createdAt:
      new Date().toISOString()
  };

  await setDoc(
    doc(db, 'orders', orderId),
    fullOrder
  );


  // ==============================
  // USER ORDER COUNT
  // ==============================

  if (orderData.userId) {

    const userRef =
      doc(
        db,
        'users',
        orderData.userId
      );

    await updateDoc(
      userRef,
      {
        ordersCount:
          increment(1)
      }
    );
  }


  // ==============================
  // USER NOTIFICATION
  // ==============================

  if (orderData.userId) {

    await addDoc(
      collection(
        db,
        'notifications'
      ),
      {
        title:
          'Order Received 📝',

        desc:
          `Your order ${orderId} has been successfully received and is pending admin review.`,

        type: 'order',

        userId:
          orderData.userId,

        createdAt:
          new Date().toISOString(),

        read: false
      }
    );
  }


  // ==============================
  // HOSTEL STATISTICS
  // ==============================

  if (
    orderData.userType === 'Hosteller' &&
    orderData.hostel
  ) {

    const hostelSnap =
      await getDocs(
        query(
          collection(db, 'hostels'),
          where(
            'name',
            '==',
            orderData.hostel
          )
        )
      );

    if (!hostelSnap.empty) {

      const hostelDoc =
        hostelSnap.docs[0];

      await updateDoc(
        doc(
          db,
          'hostels',
          hostelDoc.id
        ),
        {
          ordersCount:
            increment(1),

          revenue:
            increment(
              orderData.total
            )
        }
      );
    }
  }

  return fullOrder;
}


// =====================================================
// UPDATE ORDER STATUS
// =====================================================

export async function updateOrderStatus(
  orderId: string,
  status: Order['status']
) {

  const orderRef =
    doc(
      db,
      'orders',
      orderId
    );

  await updateDoc(
    orderRef,
    { status }
  );


  const snap =
    await getDoc(orderRef);

  if (!snap.exists()) {
    return;
  }

  const order =
    snap.data() as Order;


  if (!order.userId) {
    return;
  }


  // ==============================
  // REWARD POINTS
  // ==============================

  if (status === 'Completed') {

    await updateDoc(
      doc(
        db,
        'users',
        order.userId
      ),
      {
        points:
          increment(50)
      }
    );

    await addDoc(
      collection(
        db,
        'notifications'
      ),
      {
        title:
          'Reward Points Added 🎁',

        desc:
          'You earned +50 points for completing your assignment order!',

        userId:
          order.userId,

        type: 'system',

        createdAt:
          new Date().toISOString(),

        read: false
      }
    );
  }


  // ==============================
  // USER ORDER NOTIFICATION
  // ==============================

  let title = '';
  let desc = '';

  if (status === 'In Progress') {

    title =
      'Order Accepted 🔄';

    desc =
      `Your order ${orderId} has been accepted by the admin and is currently being processed.`;

  } else if (status === 'Rejected') {

    title =
      'Order Rejected ❌';

    desc =
      `Your order ${orderId} has been cancelled/rejected. Please contact admin on WhatsApp for details.`;
  }


  if (title) {

    await addDoc(
      collection(
        db,
        'notifications'
      ),
      {
        title,
        desc,
        type: 'order',
        userId:
          order.userId,
        createdAt:
          new Date().toISOString(),
        read: false
      }
    );
  }
}


// =====================================================
// STANDALONE PHOTO UPLOAD
// =====================================================

export async function uploadStandalonePhoto(
  photo: {
    name: string;
    note: string;
    fileName: string;
    size: string;
    dataUrl: string;
  }
) {

  const docRef =
    doc(
      collection(
        db,
        'uploaded_photos'
      )
    );

  const payload = {

    id: docRef.id,

    ...photo,

    date:
      new Date().toLocaleString(
        'en-IN',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
      ),

    createdAt:
      new Date().toISOString()
  };

  await setDoc(
    docRef,
    payload
  );

  return payload;
}


// =====================================================
// REVIEWS
// =====================================================

export async function submitReview(
  reviewData:
    Omit<Review, 'id' | 'date'>
) {

  const docRef =
    doc(
      collection(
        db,
        'reviews'
      )
    );

  const review: Review = {

    ...reviewData,

    id: docRef.id,

    date:
      new Date().toLocaleDateString(
        'en-IN',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }
      )
  };

  await setDoc(
    docRef,
    review
  );


  // ==============================
  // REWARD USER
  // ==============================

  if (reviewData.userId) {

    await updateDoc(
      doc(
        db,
        'users',
        reviewData.userId
      ),
      {
        points:
          increment(20)
      }
    );

    await addDoc(
      collection(
        db,
        'notifications'
      ),
      {
        title:
          'Review Bonus Points Added 🎁',

        desc:
          'You earned +20 points for writing a review!',

        userId:
          reviewData.userId,

        type: 'system',

        createdAt:
          new Date().toISOString(),

        read: false
      }
    );
  }

  return review;
}


// =====================================================
// CURRENCY HELPER
// =====================================================

function rupees(n: number) {

  return (
    '₹' +
    n.toLocaleString('en-IN')
  );
}
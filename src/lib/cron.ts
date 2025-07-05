// import { createTRPCMsw } from '@trpc/msw';
// import { appRouter } from '@/server/api/root';

// export async function setupIdobookingSync() {
//     // Uruchom co 15 minut
//     setInterval(() => {
//         (async () => {
//             try {
//                 console.log('Starting idobooking sync...');
//                 // Tu będzie wywołanie syncDataFromIdobooking
//                 console.log('Idobooking sync completed');
//             } catch (error) {
//                 console.error('Idobooking sync failed:', error);
//             }
//         })();
//     }, 15 * 60 * 1000); // 15 minut
// } 
// import { render, screen, waitFor } from '@testing-library/react';
// import { BrowserRouter as Router } from 'react-router-dom';
// import Home from './Home';
// // import '@testing-library/jest-dom';
//
// const mockResponse = {
//     products: [
//         { id: 1, title: 'Product 1', price: 10, images: ['image1.jpg'] },
//         { id: 2, title: 'Product 2', price: 20, images: ['image2.jpg'] },
//     ]
// } as unknown as Response;
// const mockFetchResponse = {
//     ok: true,
//     status: 200,
//     statusText: 'OK',
//     headers: new Headers(),
//     json: jest.fn().mockResolvedValue(mockResponse),
// } as unknown as Response; // Use unknown to bypass TypeScript checking for this case
//
// describe('Home Component', () => {
//     beforeEach(() => {
//         global.fetch = jest.fn().mockResolvedValue(mockFetchResponse);
//     });
//     test('fetches and renders products', async () => {
//         render(
//             <Router>
//                 <Home />
//             </Router>
//         );
//
//         // Wait for the products to be rendered
//         await waitFor(() => {
//             expect(screen.getByText('Product 1')).toBeInTheDocument();
//             expect(screen.getByText('Product 2')).toBeInTheDocument();
//             expect(screen.getByText('$10')).toBeInTheDocument();
//             expect(screen.getByText('$20')).toBeInTheDocument();
//         });
//
//         // Check if fetch was called once
//         expect(fetch).toHaveBeenCalledTimes(1);
//         // Check if fetch was called with the correct URL
//         expect(fetch).toHaveBeenCalledWith('https://dummyjson.com/products');
//     });
//     test('renders correct number of product cards', async () => {
//         render(
//             <Router>
//                 <Home />
//             </Router>
//         );
//
//         await waitFor(() => {
//             const productCards = screen.getAllByRole('img');
//             expect(productCards).toHaveLength(2);
//         });
//     });
// });
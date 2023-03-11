import { render, screen } from '@testing-library/react';
import App from './App';
import React from 'react';
import {CodeReview} from './lib/types';

let mockedUser: {id: number; displayName: string} | null = null;
let mockedChannels: {id: number; name:string}[] = [];
let mockedReviews: CodeReview[] = [];

const mockFetchData = (mockedData: unknown) => {
    return {
        then: (fn: CallableFunction) => {
            fn({
                json: jest.fn(),
            });
            return {
                then: (fn: CallableFunction) => {
                    fn(mockedData);
                }
            };
        }
    };
};

global.fetch = (url) => {
    switch (url) {
        case '/api/user':
            return mockFetchData(mockedUser);
            break;
        case '/api/channels':
            return mockFetchData(mockedChannels);
            break;
        default:
            return mockFetchData(mockedReviews);
            break;
    }
};

describe('App', () => {
    test('renders not authenticated', () => {
        mockedUser = null;
        render(<App />);
        const signInElement = screen.getByText(/Sign in/);
        expect(signInElement).toBeInTheDocument();
    });

    test('renders authenticated', () => {
        mockedUser = {id: 1, displayName: 'Test User'};
        render(<App />);

        const pendingElement = screen.getByText(/Pending/);
        const inProgressElement = screen.getByText(/In Progress/);
        const myReviewElement = screen.getByText(/My Reviews \(Test User\)/);
        const channelElement = screen.getByText(/Code Reviews For All Slack Channels/);

        expect(pendingElement).toBeInTheDocument();
        expect(inProgressElement).toBeInTheDocument();
        expect(myReviewElement).toBeInTheDocument();
        expect(channelElement).toBeInTheDocument();
    });
});

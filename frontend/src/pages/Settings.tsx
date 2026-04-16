import { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { ProfileForm } from '../components/settings/ProfileForm';
import { SecurityForm } from '../components/settings/SecurityForm';

type Tab = 'profile' | 'security';

export function Settings() {
    const [activeTab, setActiveTab] = useState<Tab>('profile');

    const tabs = [
        { id: 'profile', name: 'Profile', icon: User },
        { id: 'security', name: 'Security', icon: Lock },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Manage your personal information and security preferences.
                </p>
            </div>

            <div>
                <div className="sm:hidden">
                    <label htmlFor="tabs" className="sr-only">
                        Select a tab
                    </label>
                    <select
                        id="tabs"
                        name="tabs"
                        className="block w-full rounded-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value as Tab)}
                    >
                        {tabs.map((tab) => (
                            <option key={tab.id} value={tab.id}>
                                {tab.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="hidden sm:block">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isCurrent = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as Tab)}
                                        className={`
                      group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                      ${isCurrent
                                                ? 'border-emerald-500 text-emerald-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }
                    `}
                                        aria-current={isCurrent ? 'page' : undefined}
                                    >
                                        <Icon
                                            className={`
                        -ml-0.5 mr-2 h-5 w-5
                        ${isCurrent ? 'text-emerald-500' : 'text-gray-400 group-hover:text-gray-500'}
                      `}
                                            aria-hidden="true"
                                        />
                                        <span>{tab.name}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </div>

            <div className="mt-6">
                {activeTab === 'profile' && <ProfileForm />}
                {activeTab === 'security' && <SecurityForm />}
            </div>
        </div>
    );
}

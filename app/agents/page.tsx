'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const AGENTS = [
  {
    id: 'riley',
    name: 'Riley',
    role: 'UX Researcher',
    avatar: '👩‍🔬',
    color: 'blue',
    description: 'Analyzuji user research a hledám insights',
  },
  {
    id: 'sam',
    name: 'Sam',
    role: 'Product Strategist',
    avatar: '🎯',
    color: 'purple',
    description: 'Vytvářím product strategii a roadmapy',
  },
  {
    id: 'blake',
    name: 'Blake',
    role: 'Business Analyst',
    avatar: '📊',
    color: 'orange',
    description: 'Píšu requirements a user stories',
  },
  {
    id: 'alex',
    name: 'Alex',
    role: 'UX Designer',
    avatar: '✏️',
    color: 'green',
    description: 'Navrhuji user flows a wireframes',
  },
  {
    id: 'jordan',
    name: 'Jordan',
    role: 'UI Designer',
    avatar: '🎨',
    color: 'pink',
    description: 'Vytvářím visual design a prototypy',
  },
];

export default function AgentsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-4xl font-bold">AI Team</h1>
          <p className="text-muted-foreground mt-2">
            Vyberte agenta pro spolupráci na vašem projektu
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AGENTS.map((agent) => (
            <Card
              key={agent.id}
              className="p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <span className="text-5xl">{agent.avatar}</span>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{agent.name}</h3>
                  <p className="text-sm text-muted-foreground">{agent.role}</p>
                  <p className="text-sm mt-2">{agent.description}</p>
                </div>
              </div>
              <div className="mt-4">
                <Link href={`/agents/${agent.id}`}>
                  <Button className="w-full">
                    Chat s {agent.name}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

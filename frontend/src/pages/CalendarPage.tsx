// src/pages/CalendarPage.tsx
import * as React from "react";
import { useState } from "react";
import { Calendar as CalendarIcon, Plus, Clock, Lightbulb } from "lucide-react";
import { Calendar } from "../components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {Footer} from "../components/Footer";

// Типы
type Meeting = {
    id: string;
    title: string;
    start: Date;
    end: Date;
    isPast: boolean;
    aiAnalysis?: {
        efficiency: number;
        topics: string[];
        tip: string;
    };
};

// Мок-данные
const mockMeetings: Record<string, Meeting[]> = {
    "2025-10-16": [
        {
            id: "1",
            title: "Планирование спринта",
            start: new Date(2025, 9, 16, 10, 0),
            end: new Date(2025, 9, 16, 10, 45),
            isPast: true,
            aiAnalysis: {
                efficiency: 82,
                topics: ["бюджет", "сроки", "рииски"],
                tip: "Следующий раз выделите отдельную встречу для обсуждения рисков.",
            },
        },
        {
            id: "2",
            title: "Обзор продукта",
            start: new Date(2025, 9, 16, 14, 0),
            end: new Date(2025, 9, 16, 14, 30),
            isPast: false,
        },
    ],
    "2025-10-20": [
        {
            id: "3",
            title: "1:1 с менеджером",
            start: new Date(2025, 9, 20, 11, 0),
            end: new Date(2025, 9, 20, 11, 30),
            isPast: false,
        },
    ],
};

const formatDateKey = (date: Date): string => {
    return date.toISOString().split("T")[0];
};

const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export function CalendarPage() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    const dateKey = formatDateKey(selectedDate);
    const meetings = mockMeetings[dateKey] || [];

    const handleMeetingClick = (meetingId: string) => {
        alert(`Переход на детали встречи ${meetingId}`);
    };

    const handleCreateMeeting = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsCreateDialogOpen(false);
        alert("Встреча создана!");
    };

    return (
        <div className="flex-1 min-h-screen flex flex-col">
            {/* Main Content */}
            <div className="flex-1 p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <CalendarIcon className="text-[#4A6CF7]" /> Календарь встреч
                            </h1>
                            <p className="text-gray-600">Управляйте своими встречами и подключайте ИИ-ассистента</p>
                        </div>
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] hover:from-[#3B5AF0] hover:to-[#B45CE9] text-white border-0">
                                    <Plus className="w-4 h-4 mr-2" /> Создать встречу
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Новая встреча</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateMeeting} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Название</Label>
                                        <Input id="title" placeholder="Например: Обсуждение roadmap" required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="date">Дата</Label>
                                            <Input id="date" type="date" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="time">Время</Label>
                                            <Input id="time" type="time" required />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="duration">Длительность (мин)</Label>
                                        <Input id="duration" type="number" defaultValue="30" min="5" max="180" required />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] hover:from-[#3B5AF0] hover:to-[#B45CE9] text-white border-0"
                                    >
                                        Создать и подключить ИИ
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Calendar + Meetings */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Calendar */}
                        <Card className="p-6">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => date && setSelectedDate(date)}
                                className="rounded-md border"
                            />
                        </Card>

                        {/* Meetings List */}
                        <Card className="p-6 lg:col-span-2">
                            <CardHeader className="p-0 pb-4">
                                <CardTitle>
                                    Встречи на {selectedDate.toLocaleDateString("ru-RU", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                })}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {meetings.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <p>В этот день нет запланированных встреч</p>
                                        <Button
                                            variant="link"
                                            className="text-[#4A6CF7] mt-2"
                                            onClick={() => setIsCreateDialogOpen(true)}
                                        >
                                            Создать встречу
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {meetings.map((meeting) => (
                                            <div
                                                key={meeting.id}
                                                onClick={() => handleMeetingClick(meeting.id)}
                                                className="p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-medium text-gray-800">{meeting.title}</h3>
                                                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                                            <Clock className="w-4 h-4" />
                                                            {formatTime(meeting.start)} – {formatTime(meeting.end)}
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            meeting.isPast
                                                                ? "border-gray-300 text-gray-600 bg-gray-100"
                                                                : "border-[#4A6CF7] text-[#4A6CF7] bg-[#4A6CF7]/10"
                                                        }
                                                    >
                                                        {meeting.isPast ? "Прошедшая" : "Будущая"}
                                                    </Badge>
                                                </div>

                                                {meeting.isPast && meeting.aiAnalysis && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                                            <span className="font-medium">Эффективность:</span>
                                                            <span className="font-bold">{meeting.aiAnalysis.efficiency}%</span>
                                                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0]"
                                                                    style={{ width: `${meeting.aiAnalysis.efficiency}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 text-sm text-gray-600">
                                                            <span className="font-medium">Темы:</span>{" "}
                                                            {meeting.aiAnalysis.topics.join(", ")}
                                                        </div>
                                                        <div className="mt-2 flex items-start gap-2 text-sm text-gray-600">
                                                            <Lightbulb className="w-4 h-4 text-[#FFA94D] mt-0.5 flex-shrink-0" />
                                                            <span>{meeting.aiAnalysis.tip}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {!meeting.isPast && (
                                                    <div className="mt-4">
                                                        <Button className="bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] hover:from-[#3B5AF0] hover:to-[#B45CE9] text-white border-0 rounded-xl">
                                                            Подключить ИИ
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-[#4A6CF7]/10 to-[#C56CF0]/10 rounded-full blur-3xl"></div>
            <div className="absolute top-40 right-32 w-24 h-24 bg-gradient-to-br from-[#FFA94D]/10 to-[#FF8A65]/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-32 left-32 w-40 h-40 bg-gradient-to-br from-[#C56CF0]/10 to-[#4A6CF7]/10 rounded-full blur-3xl"></div>

            <Footer />
        </div>
    );
}
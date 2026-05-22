"use client";
import { useAlert } from "../providers/AlertProvider";

export default function MyComponent() {
    const { showAlert } = useAlert();

    const handleDelete = () => {
        const currentUser = { id: 1, name: "Ivan" };

        showAlert({
            title: "Удаление пользователя",
            message: "Вы уверены, что хотите удалить этот аккаунт? Действие необратимо.",
            presenting: currentUser,
            buttons: [
                {
                    text: "Удалить",
                    style: "destructive",
                    onPress: (user) => {
                        console.log("Удаляем пользователя:", user?.name);
                    }
                },
                {
                    text: "Отмена",
                    style: "cancel",
                }
            ]
        });
    };

    return <button onClick={handleDelete}>Удалить</button>;
}